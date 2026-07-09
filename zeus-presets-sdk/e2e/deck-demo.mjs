/**
 * E2E deck demo: linea-system + player-ui socket session.
 * Verifies synchronized session:state, nodo+oldid resolution, and degraded deck.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as ioClient } from 'socket.io-client';
import { startAll } from '../packages/linea-system/src/start-all.mjs';
import { lineaServers } from '../packages/linea-system/src/lineas.mjs';
import { createPlayerServer } from '../packages/player-ui/src/server.mjs';
import {
  ServerRegistry,
  PresetStore,
  discoverServers
} from '../packages/presets-sdk/src/index.mjs';
import {
  assert,
  waitForEvent,
  safeClose,
  shutdownE2E,
  lineasBasePath
} from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data', 'e2e-deck-run');

const LINEA_PORTS = { espana: 14111, wpHistoria: 14112 };
const LINEA_URLS = [
  `http://localhost:${LINEA_PORTS.espana}`,
  `http://localhost:${LINEA_PORTS.wpHistoria}`
];
const PLAYER_PORT = 13013;
const TEST_YEAR = 2010;

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const origPorts = { espana: lineaServers.espana.port, wpHistoria: lineaServers.wpHistoria.port };
lineaServers.espana.port = LINEA_PORTS.espana;
lineaServers.wpHistoria.port = LINEA_PORTS.wpHistoria;

let lineaHandles = [];
let player = null;
const sockets = [];

try {
  console.log('1. Starting linea-system servers...');
  lineaHandles = await startAll(lineasBasePath);

  console.log('2. Building catalog and linea-sync-observer preset...');
  const found = await discoverServers({ urls: LINEA_URLS, timeoutMs: 5000 });
  assert(found.length === 2, `Expected 2 linea servers, got ${found.length}`);

  const registry = new ServerRegistry();
  for (const s of found) {
    await registry.registerServer(s.name, s.url, 'http');
  }
  const catalog = await registry.buildCatalog();
  assert(catalog.length === 2, 'catalog should have 2 linea servers');

  const store = new PresetStore({ dataDir, fileName: 'presets.json' });
  const items = [];
  for (const server of catalog) {
    items.push(
      { serverName: server.serverName, type: 'resource', name: 'linea-info' },
      { serverName: server.serverName, type: 'tool', name: 'get_nodo' },
      { serverName: server.serverName, type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: server.serverName, type: 'prompt', name: 'report-nodo' }
    );
    if (server.serverName === 'linea-wp-historia') {
      items.push(
        { serverName: server.serverName, type: 'tool', name: 'get_oldid' },
        { serverName: server.serverName, type: 'resourceTemplate', name: 'linea-oldid' }
      );
    }
  }

  const preset = store.create({
    name: 'linea-sync-observer',
    description: 'Cross-linea preset for reporting nodo + oldid at a given historical year',
    category: 'Analysis',
    prompt: 'Report the Villacañas nodo and WP oldid at the given year using linea resources.',
    items
  });

  await registry.close();

  console.log('3. Starting player-ui...');
  player = await createPlayerServer({
    port: PLAYER_PORT,
    host: 'localhost',
    dataDir,
    discoveryUrls: LINEA_URLS
  });

  console.log('4. Connecting two socket clients...');
  const clientA = ioClient(`http://localhost:${PLAYER_PORT}/session`);
  const clientB = ioClient(`http://localhost:${PLAYER_PORT}/session`);
  sockets.push(clientA, clientB);

  const initialA = waitForEvent(clientA, 'session:state');
  const initialB = waitForEvent(clientB, 'session:state');

  await Promise.all([
    new Promise((res, rej) => { clientA.on('connect', res); clientA.on('connect_error', rej); }),
    new Promise((res, rej) => { clientB.on('connect', res); clientB.on('connect_error', rej); })
  ]);

  await Promise.all([initialA, initialB]);

  console.log('5. Loading decks with preset...');
  const loadedA = waitForEvent(clientA, 'deck:resolved', p => p.deckId === 'A' && p.nodo?.nodo?.id);
  clientA.emit('deck:load', { deckId: 'A', serverName: 'linea-espana', presetId: preset.id });
  await loadedA;

  const loadedB = waitForEvent(
    clientB,
    'deck:resolved',
    p => p.deckId === 'B' && p.nodo?.nodo?.id && p.oldid?.oldid
  );
  clientB.emit('deck:load', { deckId: 'B', serverName: 'linea-wp-historia', presetId: preset.id });
  await loadedB;

  console.log(`6. Setting playhead to ${TEST_YEAR}...`);
  const statePromiseA = waitForEvent(clientA, 'session:state', s => s.playhead?.year === TEST_YEAR);
  const statePromiseB = waitForEvent(clientB, 'session:state', s => s.playhead?.year === TEST_YEAR);
  const resolvedPromiseA = waitForEvent(
    clientA,
    'deck:resolved',
    p => p.deckId === 'A' && p.year === TEST_YEAR && p.nodo?.nodo?.id
  );
  const resolvedPromiseB = waitForEvent(
    clientB,
    'deck:resolved',
    p => p.deckId === 'B' && p.year === TEST_YEAR && p.nodo?.nodo?.id && p.oldid?.oldid
  );
  clientA.emit('playhead:set', { year: TEST_YEAR });

  const [stateA, stateB, resolvedA, resolvedB] = await Promise.all([
    statePromiseA,
    statePromiseB,
    resolvedPromiseA,
    resolvedPromiseB
  ]);

  assert(stateA.playhead.year === TEST_YEAR, 'client A playhead mismatch');
  assert(stateB.playhead.year === TEST_YEAR, 'client B playhead mismatch');
  assert(stateA.phase === stateB.phase, 'session phases should match');
  assert(stateA.decks.A.phase === 'playing' || stateA.decks.A.phase === 'cued', 'deck A should be active');
  assert(stateA.decks.B.phase === 'playing' || stateA.decks.B.phase === 'cued', 'deck B should be active');

  assert(resolvedA.deckId === 'A' && resolvedA.nodo?.nodo?.id, 'deck A nodo missing');
  assert(resolvedB.deckId === 'B' && resolvedB.nodo?.nodo?.id, 'deck B nodo missing');
  assert(resolvedB.oldid?.oldid, 'deck B oldid missing');
  assert(typeof resolvedB.oldid.oldid === 'number', 'oldid should be numeric');

  console.log('Sync OK:', {
    year: TEST_YEAR,
    nodoA: resolvedA.nodo.nodo.id,
    nodoB: resolvedB.nodo.nodo.id,
    oldid: resolvedB.oldid.oldid
  });

  console.log('7. Degraded case: stop linea-wp-historia...');
  const wpHandle = lineaHandles.find(h => h.name === 'linea-wp-historia');
  assert(wpHandle, 'linea-wp-historia handle missing');
  await safeClose(wpHandle);
  lineaHandles = lineaHandles.filter(h => h.name !== 'linea-wp-historia');
  await new Promise(r => setTimeout(r, 300));

  await player.refreshDiscovery();
  const degradedPromise = waitForEvent(clientA, 'session:state', s => s.decks?.B?.phase === 'degraded');
  clientA.emit('playhead:set', { year: TEST_YEAR });

  const degradedState = await degradedPromise;
  assert(degradedState.decks.A.phase !== 'degraded', 'deck A should remain healthy');
  assert(degradedState.decks.B.phase === 'degraded', 'deck B should be degraded');

  console.log('Degraded OK: deck A active, deck B degraded');

  console.log('\ne2e deck-demo: OK');
} catch (err) {
  console.error('\ne2e deck-demo: FAILED');
  console.error(err);
  process.exitCode = 1;
} finally {
  lineaServers.espana.port = origPorts.espana;
  lineaServers.wpHistoria.port = origPorts.wpHistoria;
  await shutdownE2E({ lineaHandles, player, sockets });
  if (process.exitCode) process.exit(process.exitCode);
}
