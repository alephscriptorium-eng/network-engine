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
  discoverServers,
  createCatalogService,
  applyPresetFilter
} from '@zeus/presets-sdk';
import { assetsDir as uiKitAssetsDir } from '@zeus/ui-kit';

import { getConfig, resolveDataDir, packageDir } from './config.mjs';
import { sessionMachine, snapshotFromActor } from './session-machine.mjs';
import { deckView } from './views/deck_view.mjs';
import {
  getAlephConfig,
  loadMedicion,
  buildAnchorGrid,
  buildTopology
} from './aleph-bridge.mjs';

function parseResourceJson(result) {
  const text = result?.contents?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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
  const discoveryUrls = options.discoveryUrls ?? config.discovery?.urls ?? [];

  const store = new PresetStore({ dataDir });
  const registry = new ServerRegistry();
  const catalog = createCatalogService({ registry });
  const actor = createActor(sessionMachine);
  actor.start();

  const broadcastState = (io) => {
    io.of('/session').emit('session:state', snapshotFromActor(actor));
  };

  async function runDiscovery() {
    const found = await discoverServers({
      urls: discoveryUrls,
      timeoutMs: config.discovery?.timeoutMs || 2000
    });
    const foundByName = new Map(found.map(s => [s.name, s]));

    for (const [name, extractor] of [...registry.extractors.entries()]) {
      if (!foundByName.has(name)) {
        await extractor.disconnect();
        registry.extractors.delete(name);
        const known = registry.knownServers.get(name);
        registry.failedServers.set(name, {
          serverConfig: known?.url,
          transportType: known?.transport || 'http',
          error: 'not responding'
        });
      }
    }

    for (const server of found) {
      try {
        await registry.registerServer(server.name, server.url, server.transport || 'http');
      } catch (error) {
        console.error(`Failed to register ${server.name}:`, error.message);
      }
    }
    await catalog.refreshCatalog();
    return found;
  }

  async function resolveDeck(deckId, year) {
    const deck = actor.getSnapshot().context.decks[deckId];
    if (!deck || !deck.serverName || deck.phase === 'empty' || deck.phase === 'loading') {
      return null;
    }

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

    // Capability gating: only resolve what the (preset-filtered) deck exposes.
    const templates = (deck.filtered?.resourceTemplates || entry.resourceTemplates || [])
      .map(t => t.name);

    let nodo = null;
    let oldid = null;

    if (templates.includes('linea-nodo')) {
      try {
        const nodoRes = await extractor.readResource(`linea://nodo/${year}`);
        nodo = parseResourceJson(nodoRes);
      } catch (error) {
        nodo = { error: error.message };
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

    let wikitext = null;
    if (templates.includes('linea-wikitext') && oldid?.oldid != null && !oldid.error) {
      try {
        const wtRes = await extractor.readResource(`linea://wikitext/${oldid.oldid}`);
        const parsed = parseResourceJson(wtRes);
        if (parsed?.error) {
          wikitext = { cached: false, error: parsed.error, hint: parsed.hint };
        } else {
          wikitext = {
            cached: parsed.cached !== false,
            bytes: parsed.wikitext_length ?? (parsed.wikitext?.length ?? 0),
            preview: typeof parsed.wikitext === 'string'
              ? parsed.wikitext.slice(0, 200)
              : undefined
          };
        }
      } catch (error) {
        wikitext = { cached: false, error: error.message };
      }
    }

    // Reaching this point means the server answered: recover from degraded.
    actor.send({ type: 'DECK_RESOLVED', deckId, phase: 'playing', resolved: { year, nodo, oldid, wikitext } });
    return { deckId, year, nodo, oldid, wikitext };
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

      const resolved = await resolveDeck(deckId, year);
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

  app.get('/', async (req, res) => {
    try {
      const servers = await catalog.getAllServers();
      const presets = store.getAll();
      const html = deckView({ servers, presets });
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (error) {
      console.error('Deck render error:', error);
      res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
  });

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: true } });

  io.of('/session').on('connection', (socket) => {
    socket.emit('session:state', snapshotFromActor(actor));

    socket.on('deck:load', (payload) => {
      handleDeckLoad(io, payload).catch(err => console.error('deck:load error:', err));
    });

    socket.on('playhead:set', async ({ year }) => {
      actor.send({ type: 'PLAYHEAD_SET', year: Number(year) });
      broadcastState(io);
      await resolveAllDecks(io);
    });

    socket.on('sync:toggle', () => {
      actor.send({ type: 'SYNC_TOGGLE' });
      broadcastState(io);
    });

    socket.on('transport:play', () => {
      actor.send({ type: 'TRANSPORT_PLAY' });
      broadcastState(io);
    });

    socket.on('transport:pause', () => {
      actor.send({ type: 'TRANSPORT_PAUSE' });
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
