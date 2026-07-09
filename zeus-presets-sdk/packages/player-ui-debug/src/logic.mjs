import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk';
import { inspectSnapshotAt } from './snapshot-inspect.mjs';
import { createSessionWait } from './session-wait.mjs';

const DEFAULT_CACHE_TIMEOUT_MS = 60000;
const CACHEABLE_ANCHOR_STATUSES = ['missing', 'stub'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/**
 * Registers player-ui-debug domain tools (socket proxy + snapshot refresh).
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ client: ReturnType<import('./client.mjs').createSessionClient>, poller: ReturnType<import('./rest-poller.mjs').createRestPoller>, stateStore: ReturnType<import('./state-store.mjs').createStateStore> }} ctx
 */
export function buildMcp(server, { client, poller, stateStore }) {
  const wait = createSessionWait(stateStore);
  server.registerTool(
    'set_playhead',
    {
      title: 'Set playhead year',
      description: 'Move the shared playhead on player-ui via playhead:set socket event.',
      inputSchema: {
        year: z.number().describe('Historical year (fraction allowed).')
      }
    },
    async ({ year }) => {
      const ok = client.setPlayhead(year);
      return jsonContent({ ok, year, snapshot: ok ? stateStore.getSnapshot() : undefined });
    }
  );

  server.registerTool(
    'transport_play',
    {
      title: 'Start transport',
      description: 'Start playhead transport via transport:play socket event.',
      inputSchema: {}
    },
    async () => {
      const ok = client.playTransport();
      return jsonContent({ ok });
    }
  );

  server.registerTool(
    'transport_pause',
    {
      title: 'Pause transport',
      description: 'Pause playhead transport via transport:pause socket event.',
      inputSchema: {}
    },
    async () => {
      const ok = client.pauseTransport();
      return jsonContent({ ok });
    }
  );

  server.registerTool(
    'sync_toggle',
    {
      title: 'Toggle deck sync',
      description: 'Toggle linked playhead between decks via sync:toggle socket event.',
      inputSchema: {}
    },
    async () => {
      const ok = client.toggleSync();
      return jsonContent({ ok });
    }
  );

  server.registerTool(
    'deck_load',
    {
      title: 'Load deck server',
      description: 'Load a catalog server (optional preset filter) onto deck A or B.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).describe('Deck id: A or B.'),
        serverName: z.string().describe('Catalog server name, e.g. linea-espana.'),
        presetId: z.string().optional().describe('Optional preset id to filter capabilities.')
      }
    },
    async ({ deckId, serverName, presetId }) => {
      const payload = presetId ? { deckId, serverName, presetId } : { deckId, serverName };
      const ok = client.deckLoad(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'registro_select',
    {
      title: 'Select registro on deck',
      description: 'Select a registro revision on a deck; re-resolves wikitext via registro:select.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (optional).'),
        oldid: z.number().describe('Wikipedia revision oldid.'),
        registro_id: z.string().optional().describe('Optional registro id.')
      }
    },
    async ({ deckId, oldid, registro_id }) => {
      const payload = registro_id ? { deckId, oldid, registro_id } : deckId ? { deckId, oldid } : { oldid };
      const ok = client.registroSelect(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'wikitext_cache',
    {
      title: 'Cache wikitext on deck',
      description: 'Call wikitext:cache on player-ui for a deck oldid when preset allows.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (optional).'),
        oldid: z.number().describe('Wikipedia revision oldid to cache.')
      }
    },
    async ({ deckId, oldid }) => {
      const payload = deckId ? { deckId, oldid } : { oldid };
      const ok = client.wikitextCache(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'wikitext_poll',
    {
      title: 'Poll wikitext cache',
      description: 'Poll wikitext cache via wikitext:poll; auto-selects when cached.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (optional).'),
        oldid: z.number().describe('Wikipedia revision oldid to poll.')
      }
    },
    async ({ deckId, oldid }) => {
      const payload = deckId ? { deckId, oldid } : { oldid };
      const ok = client.wikitextPoll(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'cache_anchor',
    {
      title: 'Cache Wave A anchor',
      description:
        'Mirror ZeusAnchorsExplorer Cachear: resolve nodo from player://aleph/anchors, cache wikitext on deck B, poll until cached, refresh anchors grid.',
      inputSchema: {
        nodoId: z.string().describe('Anchor nodo id, e.g. P06 or 06.'),
        lineaId: z.string().optional().describe('Linea id from registry (default espana).'),
        deckId: z.enum(['A', 'B']).optional().describe('Deck for cache_wikitext (default B).'),
        timeoutMs: z.number().optional().describe('Total cache+poll timeout (default 60000).'),
        pollIntervalMs: z.number().optional().describe('Poll interval (default 2000).')
      }
    },
    async ({
      nodoId,
      lineaId = 'espana',
      deckId = 'B',
      timeoutMs = DEFAULT_CACHE_TIMEOUT_MS,
      pollIntervalMs = 2000
    }) => {
      await poller.fetchAnchors(lineaId);
      const before = stateStore.getAnchors();
      const cell = findAnchorCell(before, nodoId);
      if (!cell) {
        return jsonContent({
          ok: false,
          action: 'cache_anchor',
          reason: 'anchor_not_found',
          nodoId: normalizeNodoId(nodoId),
          lineaId
        });
      }
      if (!CACHEABLE_ANCHOR_STATUSES.includes(cell.status)) {
        return jsonContent({
          ok: true,
          action: 'cache_anchor',
          skipped: true,
          reason: 'already_cached',
          nodoId: cell.nodo_id,
          lineaId,
          oldid: cell.oldid,
          status: cell.status,
          cell,
          anchors: before
        });
      }

      const oldid = Number(cell.oldid);
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
        await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
      }

      const anchors = await poller.fetchAnchors(lineaId);
      const afterCell = findAnchorCell(anchors, nodoId);

      return jsonContent({
        ok: emitted && lastWait.ok,
        action: 'cache_anchor',
        nodoId: cell.nodo_id,
        lineaId,
        deckId,
        oldid,
        statusBefore: cell.status,
        statusAfter: afterCell?.status ?? null,
        cell: afterCell ?? cell,
        anchors,
        wait: lastWait
      });
    }
  );

  server.registerTool(
    'refresh_snapshot',
    {
      title: 'Refresh monitor snapshot',
      description: 'Force REST poll and return the current player://snapshot composite.',
      inputSchema: {}
    },
    async () => {
      await poller.pollOnce();
      return jsonContent(stateStore.getSnapshot());
    }
  );

  server.registerTool(
    'session_inspect',
    {
      title: 'Inspect snapshot path',
      description:
        'Navigate player://snapshot by path — returns value, children, parent, and sibling paths.',
      inputSchema: {
        path: z.string().optional().describe('Dot path, e.g. decks.B.resolved or session.decks.A.')
      }
    },
    async ({ path }) => jsonContent(inspectSnapshotAt(stateStore, path || 'session'))
  );
}
