#!/usr/bin/env node

/**
 * @zeus/player-ui server.
 * Express + in-process @zeus/presets-sdk + socket.io /session namespace.
 */

import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createActor } from 'xstate';
import {
  ServerRegistry,
  PresetStore,
  syncDiscoveredServers,
  resolveDiscoverySources,
  createCatalogService,
  applyPresetFilter
} from '@zeus/presets-sdk';
import { assetsDir as uiKitAssetsDir } from '@zeus/ui-kit';

import { getConfig, resolveDataDir, packageDir } from './config.mjs';
import { ThemeHandler } from './theme-handler.mjs';
import { createThemeRoutes } from './theme-routes.mjs';
import { sessionMachine, snapshotFromActor } from './session-machine.mjs';
import { deckView } from './views/deck_view.mjs';
import { sessionView } from './views/session_view.mjs';
import {
  getAlephConfig,
  loadMedicion,
  buildAnchorGrid,
  buildTopology
} from './aleph-bridge.mjs';

const DEBUG_FETCH_MS = 800;

function getDebugMonitorBase(config) {
  if (config.debugMonitor?.enabled === false) return null;
  return config.debugMonitor?.baseUrl || 'http://localhost:3014';
}

async function fetchDebugMonitor(baseUrl, pathname) {
  const url = `${baseUrl.replace(/\/$/, '')}${pathname}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEBUG_FETCH_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { available: false, status: res.status };
    return await res.json();
  } catch {
    return { available: false };
  } finally {
    clearTimeout(timer);
  }
}

function parseResourceJson(result) {
  const text = result?.contents?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function parseToolJson(content) {
  const text = content?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function parseEmbeddedJson(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}

function buildWikitextResult(parsed, oldid) {
  const oid = parsed?.oldid ?? oldid;
  if (!parsed) {
    return { cached: false, oldid: oid, error: 'empty response' };
  }
  if (parsed.error) {
    return {
      cached: false,
      oldid: oid,
      error: parsed.error,
      hint: parsed.hint,
      stats: parsed.stats,
      action: parsed.action
    };
  }
  return {
    cached: parsed.cached !== false,
    oldid: oid,
    bytes: parsed.wikitext_length ?? (parsed.wikitext?.length ?? 0),
    preview: typeof parsed.wikitext === 'string'
      ? parsed.wikitext.slice(0, 200)
      : undefined
  };
}

/**
 * Programmatic bootstrap for e2e and CLI.
 * @param {object} [options]
 * @param {number} [options.port]
 * @param {string} [options.host]
 * @param {string} [options.dataDir]
 * @param {string[]} [options.discoveryUrls]
 */
export async function createPlayerServer(options = {}) {
  const config = getConfig();
  const port = options.port ?? config.server?.port ?? 3013;
  const host = options.host ?? config.server?.host ?? 'localhost';
  const dataDir = options.dataDir ?? resolveDataDir(config);
  const themeHandler = new ThemeHandler();

  const store = new PresetStore({ dataDir });
  const registry = new ServerRegistry();
  const catalog = createCatalogService({ registry });
  const discoverySources = resolveDiscoverySources({
    dataDir,
    localDiscovery: options.discoveryUrls
      ? { ...config.discovery, urls: options.discoveryUrls }
      : config.discovery
  });
  const actor = createActor(sessionMachine);
  actor.start();
  const alephConfig = getAlephConfig(config);
  actor.send({ type: 'CASO_SET', casoId: alephConfig.defaultCaso || 'aeo-p24-linea' });

  const debugEnabled = config.debug === true;
  const debugStats = {
    startedAt: Date.now(),
    eventCounts: {},
    lastResolveMs: { A: null, B: null },
    resolveCount: { A: 0, B: 0 }
  };

  const bumpDebugEvent = (event) => {
    if (!debugEnabled) return;
    debugStats.eventCounts[event] = (debugStats.eventCounts[event] || 0) + 1;
  };

  const broadcastState = (io) => {
    bumpDebugEvent('session:state');
    io.of('/session').emit('session:state', snapshotFromActor(actor));
  };

  async function runDiscovery() {
    return syncDiscoveredServers(registry, discoverySources, {
      catalog,
      pruneStale: true,
      registerMode: 'strict'
    });
  }

  async function listServers() {
    await runDiscovery();
    return catalog.getAllServers();
  }

  async function fetchWikitext(extractor, oldid) {
    if (oldid == null) return null;
    const oid = Number(oldid);
    try {
      const wtRes = await extractor.readResource(`linea://wikitext/${oid}`);
      return buildWikitextResult(parseResourceJson(wtRes), oid);
    } catch (error) {
      const embedded = parseEmbeddedJson(error.message);
      if (embedded?.error) {
        return buildWikitextResult(embedded, oid);
      }
      return { cached: false, oldid: oid, error: error.message };
    }
  }

  function deckAllowsTool(deck, entry, toolName) {
    const tools = deck.filtered?.tools || entry?.tools || [];
    return tools.some((t) => t.name === toolName);
  }

  async function getDeckExtractor(deckId) {
    const deck = actor.getSnapshot().context.decks[deckId];
    if (!deck?.serverName) return { error: 'deck not loaded' };
    const entry = await catalog.getServerEntry(deck.serverName);
    if (!entry || entry.isConnected === false) {
      return { error: 'disconnected', deck };
    }
    const extractor = registry.extractors.get(deck.serverName);
    if (!extractor) return { error: 'no extractor', deck };
    return { deck, entry, extractor };
  }

  async function resolveDeck(deckId, year, selectedOldid = null, io = null) {
    const deck = actor.getSnapshot().context.decks[deckId];
    if (!deck || !deck.serverName || deck.phase === 'empty' || deck.phase === 'loading') {
      return null;
    }

    const resolveStarted = debugEnabled ? performance.now() : 0;

    const entry = await catalog.getServerEntry(deck.serverName);
    if (!entry || entry.isConnected === false) {
      actor.send({ type: 'DECK_DEGRADED', deckId });
      return { deckId, year, error: 'disconnected' };
    }

    const extractor = registry.extractors.get(deck.serverName);
    if (!extractor) {
      actor.send({ type: 'DECK_DEGRADED', deckId });
      return { deckId, year, error: 'no extractor' };
    }

    const templates = (deck.filtered?.resourceTemplates || entry.resourceTemplates || [])
      .map(t => t.name);

    let nodo = null;
    let oldid = null;
    let registrosPayload = null;
    let selected = null;
    let wikitext = null;

    if (templates.includes('linea-nodo')) {
      try {
        const nodoRes = await extractor.readResource(`linea://nodo/${year}`);
        nodo = parseResourceJson(nodoRes);
      } catch (error) {
        nodo = { error: error.message };
      }
    }

    if (templates.includes('linea-registros-year')) {
      try {
        const regRes = await extractor.readResource(`linea://registros/year/${year}`);
        const parsed = parseResourceJson(regRes);
        if (parsed?.error) {
          registrosPayload = { error: parsed.error };
        } else {
          registrosPayload = {
            anchor: parsed.anchor ?? null,
            sections: parsed.sections ?? [],
            items: parsed.registros ?? [],
            total: parsed.total ?? 0,
            cached_count: parsed.cached_count ?? 0
          };
          if (!nodo?.nodo && parsed.nodo) {
            nodo = { nodo: parsed.nodo };
          }
        }
      } catch (error) {
        registrosPayload = { error: error.message };
      }
    }

    if (templates.includes('linea-oldid')) {
      try {
        const oldidRes = await extractor.readResource(`linea://oldid/${year}`);
        oldid = parseResourceJson(oldidRes);
      } catch (error) {
        oldid = { error: error.message };
      }
    }

    const pickOldid = selectedOldid ?? oldid?.oldid ?? registrosPayload?.anchor?.oldid ?? null;

    if (templates.includes('linea-wikitext') && pickOldid != null) {
      wikitext = await fetchWikitext(extractor, pickOldid);
      if (selectedOldid != null) {
        const match = registrosPayload?.items?.find(r => r.oldid === Number(selectedOldid));
        selected = match ?? { oldid: Number(selectedOldid) };
      }
    } else if (templates.includes('linea-wikitext') && oldid?.oldid != null && !oldid.error) {
      wikitext = await fetchWikitext(extractor, oldid.oldid);
    }

    const resolved = { year, nodo, oldid, registros: registrosPayload, selected, wikitext };
    actor.send({ type: 'DECK_RESOLVED', deckId, phase: 'playing', resolved });

    if (debugEnabled && io) {
      const ms = performance.now() - resolveStarted;
      debugStats.lastResolveMs[deckId] = ms;
      debugStats.resolveCount[deckId] = (debugStats.resolveCount[deckId] || 0) + 1;
      bumpDebugEvent('deck:resolved');
      io.of('/session').emit('debug:resolve-timing', { deckId, year, ms });
    }

    return { deckId, ...resolved };
  }

  async function handleRegistroSelect(io, { deckId = 'B', oldid, registro_id }) {
    const year = actor.getSnapshot().context.playhead.year;
    const resolved = await resolveDeck(deckId, year, oldid, io);
    if (resolved) {
      io.of('/session').emit('deck:resolved', resolved);
      broadcastState(io);
    }
    return resolved;
  }

  async function handleWikitextCache(socket, { deckId = 'B', oldid }) {
    const ctx = await getDeckExtractor(deckId);
    if (ctx.error) {
      socket.emit('wikitext:cache-result', { ok: false, error: ctx.error });
      return;
    }
    const { deck, entry, extractor } = ctx;
    if (!deckAllowsTool(deck, entry, 'cache_wikitext')) {
      socket.emit('wikitext:cache-result', {
        ok: false,
        error: 'preset does not include cache_wikitext tool'
      });
      return;
    }
    try {
      const content = await extractor.callTool('cache_wikitext', { oldid: Number(oldid) });
      const parsed = parseToolJson(content);
      socket.emit('wikitext:cache-result', {
        ok: !parsed?.error,
        oldid: Number(oldid),
        ...parsed
      });
    } catch (error) {
      socket.emit('wikitext:cache-result', { ok: false, oldid: Number(oldid), error: error.message });
    }
  }

  async function handleWikitextPoll(io, socket, { deckId = 'B', oldid }) {
    const ctx = await getDeckExtractor(deckId);
    if (ctx.error) {
      socket.emit('wikitext:poll-result', { cached: false, error: ctx.error });
      return;
    }
    const wikitext = await fetchWikitext(ctx.extractor, oldid);
    if (wikitext?.cached) {
      await handleRegistroSelect(io, { deckId, oldid: Number(oldid) });
      socket.emit('wikitext:poll-result', { cached: true, oldid: Number(oldid) });
    } else {
      socket.emit('wikitext:poll-result', {
        cached: false,
        oldid: Number(oldid),
        error: wikitext?.error,
        action: wikitext?.action
      });
    }
  }

  async function resolveAllDecks(io) {
    const { playhead, decks } = actor.getSnapshot().context;
    const year = playhead.year;
    const results = [];
    for (const deckId of Object.keys(decks)) {
      const deck = decks[deckId];
      if (deck.phase === 'empty' || deck.phase === 'loading') continue;

      const entry = await catalog.getServerEntry(deck.serverName);
      if (!entry || entry.isConnected === false) {
        actor.send({ type: 'DECK_DEGRADED', deckId });
        results.push({ deckId, year, error: 'disconnected' });
        continue;
      }

      const resolved = await resolveDeck(deckId, year, null, io);
      if (resolved) {
        results.push(resolved);
        io.of('/session').emit('deck:resolved', resolved);
      }
    }
    broadcastState(io);
    return results;
  }

  async function handleDeckLoad(io, { deckId, serverName, presetId }) {
    actor.send({ type: 'DECK_LOADING', deckId, serverName, presetId });
    broadcastState(io);

    const entry = await catalog.getServerEntry(serverName);
    const preset = presetId ? store.getById(presetId) : null;
    const filtered = applyPresetFilter(entry, preset);
    const phase = !entry || entry.isConnected === false ? 'degraded' : 'cued';

    actor.send({ type: 'DECK_LOADED', deckId, phase, filtered });
    broadcastState(io);
    await resolveAllDecks(io);
  }

  await runDiscovery();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use('/assets', express.static(uiKitAssetsDir));
  app.use('/assets', express.static(path.join(packageDir, 'assets')));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'player-ui', timestamp: new Date().toISOString() });
  });

  app.use('/api', createThemeRoutes(themeHandler));

  app.get('/api/presets', (req, res) => {
    res.json(store.getAll().map(p => ({ id: p.id, name: p.name, description: p.description })));
  });

  app.get('/api/aleph/config', (req, res) => {
    res.json(getAlephConfig(config));
  });

  app.get('/api/aleph/anchors', async (req, res) => {
    try {
      const alephPaths = config.aleph?.paths;
      let cacheStats = null;
      const extractor = registry.extractors.get('linea-wp-historia');
      if (extractor) {
        try {
          const statsRes = await extractor.readResource('linea://cache/stats');
          cacheStats = parseResourceJson(statsRes);
        } catch {
          cacheStats = { error: 'linea-wp-historia unavailable' };
        }
      }
      const cachedOldids = cacheStats?.cached_oldids || [];
      const grid = buildAnchorGrid(cachedOldids, null, alephPaths);
      res.json({ cacheStats, grid });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/aleph/medicion/:casoId', (req, res) => {
    const data = loadMedicion(req.params.casoId, config.aleph?.paths);
    if (data.error) {
      res.status(404).json(data);
      return;
    }
    res.json(data);
  });

  app.get('/api/aleph/registros/:year', async (req, res) => {
    try {
      const year = Number(req.params.year);
      const extractor = registry.extractors.get('linea-wp-historia');
      if (!extractor) {
        res.status(503).json({ error: 'linea-wp-historia unavailable' });
        return;
      }
      const regRes = await extractor.readResource(`linea://registros/year/${year}`);
      res.json(parseResourceJson(regRes));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/aleph/topology', async (req, res) => {
    try {
      const cards = {};
      for (const [key, serverName] of [['espana', 'linea-espana'], ['wpHistoria', 'linea-wp-historia']]) {
        const extractor = registry.extractors.get(serverName);
        if (extractor) {
          try {
            const cardRes = await extractor.readResource('server://card');
            cards[key] = parseResourceJson(cardRes);
          } catch {
            cards[key] = { error: 'unavailable' };
          }
        }
      }
      res.json(buildTopology(cards));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/servers', async (req, res) => {
    try {
      const servers = await listServers();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const debugMonitorBase = getDebugMonitorBase(config);

  app.get('/api/debug/health', async (req, res) => {
    if (!debugMonitorBase) {
      return res.json({ available: false, reason: 'debugMonitor disabled' });
    }
    const data = await fetchDebugMonitor(debugMonitorBase, '/mcp/health');
    if (data.available === false) {
      return res.status(503).json(data);
    }
    res.json({ available: true, ...data });
  });

  app.get('/api/debug/snapshot', async (req, res) => {
    if (!debugMonitorBase) {
      return res.json({ available: false, reason: 'debugMonitor disabled' });
    }
    const data = await fetchDebugMonitor(debugMonitorBase, '/snapshot');
    if (data.available === false) {
      return res.json(data);
    }
    res.json(data);
  });

  app.get('/api/debug/at', async (req, res) => {
    const pathParam = req.query.path || 'session';
    if (!debugMonitorBase) {
      return res.json({ available: false, reason: 'debugMonitor disabled' });
    }
    const encoded = encodeURIComponent(String(pathParam));
    const data = await fetchDebugMonitor(debugMonitorBase, `/snapshot/at?path=${encoded}`);
    if (data.available === false) {
      return res.json(data);
    }
    res.json(data);
  });

  app.get('/session', async (req, res) => {
    try {
      const html = sessionView({
        themes: themeHandler.getAvailableThemes(),
        currentTheme: themeHandler.getCurrentTheme(),
        debugEnabled: config.debug === true
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (error) {
      console.error('Session render error:', error);
      res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
  });

  app.get('/', async (req, res) => {
    try {
      const servers = await listServers();
      const presets = store.getAll();
      const html = deckView({
        servers,
        presets,
        themes: themeHandler.getAvailableThemes(),
        currentTheme: themeHandler.getCurrentTheme()
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (error) {
      console.error('Deck render error:', error);
      res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
  });

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: true } });

  let debugHeartbeat = null;
  if (debugEnabled) {
    debugHeartbeat = setInterval(() => {
      io.of('/session').emit('debug:stats', {
        uptime: Date.now() - debugStats.startedAt,
        lastResolveMs: { ...debugStats.lastResolveMs },
        resolveCount: { ...debugStats.resolveCount },
        eventCounts: { ...debugStats.eventCounts }
      });
    }, 1000);
  }

  io.of('/session').on('connection', async (socket) => {
    try {
      const servers = await listServers();
      socket.emit('catalog:servers', servers);
    } catch (error) {
      console.error('Discovery on connect failed:', error.message);
      socket.emit('catalog:servers', []);
    }
    socket.emit('session:state', snapshotFromActor(actor));

    socket.on('deck:load', (payload) => {
      bumpDebugEvent('deck:load');
      handleDeckLoad(io, payload).catch(err => console.error('deck:load error:', err));
    });

    socket.on('playhead:set', async ({ year }) => {
      bumpDebugEvent('playhead:set');
      actor.send({ type: 'PLAYHEAD_SET', year: Number(year) });
      broadcastState(io);
      await resolveAllDecks(io);
    });

    socket.on('registro:select', (payload) => {
      bumpDebugEvent('registro:select');
      handleRegistroSelect(io, payload).catch(err => console.error('registro:select error:', err));
    });

    socket.on('wikitext:cache', (payload) => {
      bumpDebugEvent('wikitext:cache');
      handleWikitextCache(socket, payload).catch(err => console.error('wikitext:cache error:', err));
    });

    socket.on('wikitext:poll', (payload) => {
      bumpDebugEvent('wikitext:poll');
      handleWikitextPoll(io, socket, payload).catch(err => console.error('wikitext:poll error:', err));
    });

    socket.on('sync:toggle', () => {
      bumpDebugEvent('sync:toggle');
      actor.send({ type: 'SYNC_TOGGLE' });
      broadcastState(io);
    });

    socket.on('transport:play', () => {
      bumpDebugEvent('transport:play');
      actor.send({ type: 'TRANSPORT_PLAY' });
      broadcastState(io);
    });

    socket.on('transport:pause', () => {
      bumpDebugEvent('transport:pause');
      actor.send({ type: 'TRANSPORT_PAUSE' });
      broadcastState(io);
    });

    socket.on('caso:set', ({ casoId }) => {
      if (!casoId || typeof casoId !== 'string') return;
      bumpDebugEvent('caso:set');
      actor.send({ type: 'CASO_SET', casoId });
      broadcastState(io);
    });
  });

  const started = await new Promise((resolve, reject) => {
    httpServer.listen(port, host, () => resolve({ port, host }));
    httpServer.on('error', reject);
  });

  return {
    app,
    httpServer,
    io,
    actor,
    registry,
    catalog,
    store,
    port: started.port,
    host: started.host,
    url: `http://${started.host}:${started.port}`,
    refreshDiscovery: runDiscovery,
    async markDeckDegraded(deckId) {
      actor.send({ type: 'DECK_DEGRADED', deckId });
      broadcastState(io);
    },
    close: async () => {
      if (debugHeartbeat) clearInterval(debugHeartbeat);
      actor.send({ type: 'SESSION_CLOSE' });
      actor.stop();
      await registry.close();
      await new Promise((res, rej) => httpServer.close(err => (err ? rej(err) : res())));
    }
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const server = await createPlayerServer();
  console.log(`Player UI running on ${server.url}`);
  console.log(`Preset store: ${resolveDataDir()} (${server.store.count()} preset(s))`);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
