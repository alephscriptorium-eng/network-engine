import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk';
import { createSessionWait } from './session-wait.mjs';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_SERVERS = { A: 'linea-espana', B: 'linea-wp-historia' };
const FALLBACK_PARTE_CUES = [
  { id: 'I', year: 450 },
  { id: 'II', year: 1350 },
  { id: 'III', year: 1808 },
  { id: 'IV', year: 1978 }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeDeck(deck) {
  if (!deck) return null;
  const resolved = deck.resolved;
  const nodoId = resolved?.nodo?.nodo?.id || resolved?.nodo?.id || null;
  return {
    phase: deck.phase,
    serverName: deck.serverName,
    presetId: deck.presetId,
    nodoId,
    year: resolved?.year ?? null,
    wikitextCached: resolved?.wikitext?.cached === true,
    registrosCount: Array.isArray(resolved?.registros) ? resolved.registros.length : 0
  };
}

function buildSessionReport(stateStore) {
  const snap = stateStore.getSnapshot();
  return {
    phase: snap.session?.phase,
    year: snap.session?.playhead?.year,
    playing: snap.session?.playhead?.playing,
    sync: snap.session?.sync,
    activeCaso: snap.session?.activeCaso,
    health: snap.health,
    decks: {
      A: summarizeDeck(snap.decks?.A ?? snap.session?.decks?.A),
      B: summarizeDeck(snap.decks?.B ?? snap.session?.decks?.B)
    }
  };
}

function normalizeNodoId(nodoId) {
  const raw = String(nodoId).trim().toUpperCase();
  return raw.startsWith('P') ? raw : `P${raw}`;
}

function findAnchorCell(anchors, nodoId) {
  const grid = anchors?.grid ?? anchors;
  const cells = grid?.cells;
  if (!Array.isArray(cells)) return null;
  const target = normalizeNodoId(nodoId);
  return cells.find((c) => normalizeNodoId(c.nodo_id) === target) ?? null;
}

function resolveParteYear(stateStore, parteId) {
  const cues = stateStore.getSession()?.parteCues ?? FALLBACK_PARTE_CUES;
  const cue = cues.find((c) => String(c.id) === String(parteId));
  return cue?.year ?? null;
}

/**
 * Registers high-level session orchestration tools (composite DJ operations).
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ client: ReturnType<import('./client.mjs').createSessionClient>, poller: ReturnType<import('./rest-poller.mjs').createRestPoller>, stateStore: ReturnType<import('./state-store.mjs').createStateStore> }} ctx
 */
export function buildMcp(server, { client, poller, stateStore }) {
  const wait = createSessionWait(stateStore);

  server.registerTool(
    'bootstrap_decks',
    {
      title: 'Bootstrap Tablero decks',
      description:
        'Load default servers onto deck A (linea-espana) and B (linea-wp-historia), mirroring browser autoLoadDecks.',
      inputSchema: {
        presetIdA: z.string().optional().describe('Optional preset id for deck A.'),
        presetIdB: z.string().optional().describe('Optional preset id for deck B.'),
        timeoutMs: z.number().optional().describe('Wait timeout per deck (default 8000).')
      }
    },
    async ({ presetIdA, presetIdB, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
      const before = buildSessionReport(stateStore);
      const payloadA = { deckId: 'A', serverName: DEFAULT_SERVERS.A, ...(presetIdA ? { presetId: presetIdA } : {}) };
      const payloadB = { deckId: 'B', serverName: DEFAULT_SERVERS.B, ...(presetIdB ? { presetId: presetIdB } : {}) };
      const okA = client.deckLoad(payloadA);
      const okB = client.deckLoad(payloadB);
      const [waitA, waitB] = await Promise.all([
        wait.waitForDeckResolve('A', { timeoutMs }),
        wait.waitForDeckResolve('B', { timeoutMs })
      ]);
      return jsonContent({
        ok: okA && okB && waitA.ok && waitB.ok,
        action: 'bootstrap_decks',
        waitedMs: Math.max(waitA.waitedMs, waitB.waitedMs),
        before,
        after: buildSessionReport(stateStore),
        decks: { A: waitA, B: waitB },
        emitted: { A: payloadA, B: payloadB }
      });
    }
  );

  server.registerTool(
    'goto_parte',
    {
      title: 'Go to Parte cue',
      description: 'Move playhead to a Parte I–IV cue year (450, 1350, 1808, 1978) and wait for resolution.',
      inputSchema: {
        parteId: z.enum(['I', 'II', 'III', 'IV']).describe('Parte id: I, II, III, or IV.'),
        timeoutMs: z.number().optional().describe('Wait timeout (default 8000).')
      }
    },
    async ({ parteId, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
      const before = buildSessionReport(stateStore);
      const year = resolveParteYear(stateStore, parteId);
      if (year == null) {
        return jsonContent({ ok: false, action: 'goto_parte', reason: 'unknown_parte', parteId, before });
      }
      const emitted = client.setPlayhead(year);
      const playheadWait = await wait.waitForPlayhead(year, { timeoutMs });
      const deckA = await wait.waitForDeckResolve('A', { year, timeoutMs });
      const deckB = await wait.waitForDeckResolve('B', { year, timeoutMs });
      return jsonContent({
        ok: emitted && playheadWait.ok,
        action: 'goto_parte',
        parteId,
        year,
        waitedMs: playheadWait.waitedMs,
        before,
        after: buildSessionReport(stateStore),
        decks: { A: deckA, B: deckB }
      });
    }
  );

  server.registerTool(
    'goto_anchor',
    {
      title: 'Go to anchor nodo',
      description:
        'Jump to an ALEPH anchor (P01–P24): set playhead year and select registro on deck B, mirroring anchor LED click.',
      inputSchema: {
        nodoId: z.string().describe('Anchor nodo id, e.g. P23 or 23.'),
        lineaId: z.string().optional().describe('Linea id from registry (default espana).'),
        timeoutMs: z.number().optional().describe('Wait timeout (default 8000).')
      }
    },
    async ({ nodoId, lineaId = 'espana', timeoutMs = DEFAULT_TIMEOUT_MS }) => {
      const before = buildSessionReport(stateStore);
      await poller.fetchAnchors(lineaId);
      const cell = findAnchorCell(stateStore.getAnchors(), nodoId);
      if (!cell?.year) {
        return jsonContent({
          ok: false,
        action: 'goto_anchor',
        reason: 'anchor_not_found',
        nodoId: normalizeNodoId(nodoId),
        lineaId,
        before
        });
      }
      const year = Number(cell.year);
      const oldid = Number(cell.oldid);
      const playOk = client.setPlayhead(year);
      const regOk = oldid ? client.registroSelect({ deckId: 'B', oldid }) : true;
      const playheadWait = await wait.waitForPlayhead(year, { timeoutMs });
      const deckB = await wait.waitForDeckResolve('B', {
        year,
        nodoId: normalizeNodoId(nodoId),
        timeoutMs
      });
      return jsonContent({
        ok: playOk && regOk && playheadWait.ok,
        action: 'goto_anchor',
        nodoId: normalizeNodoId(nodoId),
        lineaId,
        year,
        oldid: oldid || null,
        waitedMs: playheadWait.waitedMs,
        before,
        after: buildSessionReport(stateStore),
        anchor: cell,
        deckB
      });
    }
  );

  server.registerTool(
    'goto_year',
    {
      title: 'Go to historical year',
      description: 'Set playhead to a year and optionally auto-select the first registro on deck B.',
      inputSchema: {
        year: z.number().describe('Historical year (fraction allowed).'),
        selectRegistro: z.boolean().optional().describe('Auto-select first registro on deck B after resolve.'),
        timeoutMs: z.number().optional().describe('Wait timeout (default 8000).')
      }
    },
    async ({ year, selectRegistro = false, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
      const before = buildSessionReport(stateStore);
      const emitted = client.setPlayhead(year);
      const playheadWait = await wait.waitForPlayhead(year, { timeoutMs });
      const deckB = await wait.waitForDeckResolve('B', { year, timeoutMs });
      let registro = null;
      if (selectRegistro && deckB.ok) {
        const resolved = stateStore.getDeck('B')?.resolved;
        const first = resolved?.registros?.[0];
        const oldid = first?.oldid ?? first?.revision?.oldid;
        if (oldid) {
          client.registroSelect({ deckId: 'B', oldid: Number(oldid) });
          registro = { oldid: Number(oldid) };
          await wait.waitForDeckResolve('B', { year, timeoutMs: 2000 });
        }
      }
      return jsonContent({
        ok: emitted && playheadWait.ok,
        action: 'goto_year',
        year,
        selectRegistro,
        registro,
        waitedMs: playheadWait.waitedMs,
        before,
        after: buildSessionReport(stateStore),
        deckB
      });
    }
  );

  server.registerTool(
    'ensure_wikitext',
    {
      title: 'Ensure wikitext cached',
      description: 'Cache and poll wikitext for a deck oldid until cached or timeout (mirrors browser poll loop).',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (default B).'),
        oldid: z.number().describe('Wikipedia revision oldid.'),
        timeoutMs: z.number().optional().describe('Total timeout (default 8000).'),
        pollIntervalMs: z.number().optional().describe('Poll interval (default 2000).')
      }
    },
    async ({ deckId = 'B', oldid, timeoutMs = DEFAULT_TIMEOUT_MS, pollIntervalMs = 2000 }) => {
      const before = buildSessionReport(stateStore);
      const emitted = client.wikitextCache({ deckId, oldid });
      const deadline = Date.now() + timeoutMs;
      let lastWait = { ok: false, reason: 'timeout' };
      while (Date.now() < deadline) {
        const remaining = deadline - Date.now();
        lastWait = await wait.waitForWikitextCached(deckId, oldid, {
          timeoutMs: Math.min(pollIntervalMs, remaining)
        });
        if (lastWait.ok) break;
        client.wikitextPoll({ deckId, oldid });
        await sleep(Math.min(pollIntervalMs, deadline - Date.now()));
      }
      return jsonContent({
        ok: emitted && lastWait.ok,
        action: 'ensure_wikitext',
        deckId,
        oldid,
        waitedMs: lastWait.waitedMs,
        before,
        after: buildSessionReport(stateStore),
        wait: lastWait
      });
    }
  );

  server.registerTool(
    'select_caso',
    {
      title: 'Select ALEPH caso',
      description:
        'Set active caso via caso:set socket (syncs operator browser VU meters) and fetch medicion REST.',
      inputSchema: {
        casoId: z.string().describe('Caso id, e.g. aeo-p24-linea.'),
        timeoutMs: z.number().optional().describe('Wait timeout (default 8000).')
      }
    },
    async ({ casoId, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
      const before = buildSessionReport(stateStore);
      const emitted = client.setCaso(casoId);
      const casoWait = await wait.waitForActiveCaso(casoId, { timeoutMs });
      const medicion = await poller.fetchMedicion(casoId);
      return jsonContent({
        ok: emitted && casoWait.ok && !medicion?.error,
        action: 'select_caso',
        casoId,
        waitedMs: casoWait.waitedMs,
        before,
        after: buildSessionReport(stateStore),
        medicion,
        wait: casoWait
      });
    }
  );

  server.registerTool(
    'wait_for_session',
    {
      title: 'Wait for session condition',
      description: 'Block until session matches optional year, deck nodo, or phase; returns snapshot on match or timeout.',
      inputSchema: {
        year: z.number().optional().describe('Expected playhead year.'),
        deckId: z.enum(['A', 'B']).optional().describe('Deck to check nodo on.'),
        nodoId: z.string().optional().describe('Expected resolved nodo id on deckId.'),
        phase: z.string().optional().describe('Expected session phase.'),
        timeoutMs: z.number().optional().describe('Wait timeout (default 8000).')
      }
    },
    async ({ year, deckId, nodoId, phase, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
      const before = buildSessionReport(stateStore);
      const result = await wait.waitFor({
        timeoutMs,
        predicate: (snap) => {
          if (phase && snap.session?.phase !== phase) return false;
          if (year != null) {
            const y = snap.session?.playhead?.year;
            if (typeof y !== 'number' || Math.abs(y - year) > 0.001) return false;
          }
          if (deckId && nodoId) {
            const deck = snap.session?.decks?.[deckId] ?? snap.decks?.[deckId];
            const nid = deck?.resolved?.nodo?.nodo?.id || deck?.resolved?.nodo?.id;
            if (nid !== normalizeNodoId(nodoId)) return false;
          }
          return true;
        }
      });
      return jsonContent({
        ok: result.ok,
        action: 'wait_for_session',
        waitedMs: result.waitedMs,
        reason: result.reason,
        before,
        after: buildSessionReport(stateStore)
      });
    }
  );

  server.registerTool(
    'session_report',
    {
      title: 'Session report',
      description: 'Force REST poll and return a structured Tablero summary for operator alignment.',
      inputSchema: {}
    },
    async () => {
      await poller.pollOnce();
      const report = buildSessionReport(stateStore);
      return jsonContent({
        ok: true,
        action: 'session_report',
        report,
        snapshot: stateStore.getSnapshot()
      });
    }
  );
}
