/**
 * E2E Tablero ALEPH: presets + REST API + deck resolution with registros bridge.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as ioClient } from 'socket.io-client';
import { startAll } from '../packages/linea-system/src/start-all.mjs';
import { lineaServers } from '../packages/linea-system/src/lineas.mjs';
import { createPlayerServer } from '../packages/player-ui/src/server.mjs';
import { PresetStore } from '../packages/presets-sdk/src/preset-store.mjs';
import {
  assert,
  waitForEvent,
  shutdownE2E,
  lineasBasePath
} from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data', 'e2e-tablero-run');

const LINEA_PORTS = { espana: 14111, wpHistoria: 14112 };
const LINEA_URLS = [
  `http://localhost:${LINEA_PORTS.espana}`,
  `http://localhost:${LINEA_PORTS.wpHistoria}`
];
const PLAYER_PORT = 13014;
const TEST_YEAR = 2026;
const TEST_YEAR_HIST = 1000;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const origPorts = { espana: lineaServers.espana.port, wpHistoria: lineaServers.wpHistoria.port };
lineaServers.espana.port = LINEA_PORTS.espana;
lineaServers.wpHistoria.port = LINEA_PORTS.wpHistoria;

let lineaHandles = [];
let player = null;
let client = null;

try {
  console.log('1. Seed ALEPH presets...');
  const { execSync } = await import('node:child_process');
  execSync('node scripts/seed-aleph-presets.mjs', { cwd: repoRoot, stdio: 'inherit' });

  const mainStore = new PresetStore({ dataDir: path.join(repoRoot, 'data') });
  const presetA = mainStore.getByName('aleph-tronco-puro');
  const presetB = mainStore.getByName('aleph-wp-cache');
  assert(presetA, 'aleph-tronco-puro missing — run seed:aleph');
  assert(presetB, 'aleph-wp-cache missing — run seed:aleph');
  assert(
    presetB.items.some(i => i.name === 'cache_wikitext'),
    'aleph-wp-cache should include cache_wikitext tool'
  );

  console.log('2. Starting linea-system...');
  lineaHandles = await startAll(lineasBasePath);

  console.log('3. Starting player-ui...');
  player = await createPlayerServer({
    port: PLAYER_PORT,
    host: 'localhost',
    dataDir: path.join(repoRoot, 'data'),
    discoveryUrls: LINEA_URLS
  });

  const base = `http://localhost:${PLAYER_PORT}`;

  console.log('4. REST /api/aleph/config...');
  const config = await fetchJson(`${base}/api/aleph/config`);
  assert(config.defaultCaso === 'aeo-p24-linea', 'defaultCaso mismatch');
  assert(config.defaultPresets?.B === 'aleph-wp-cache', 'default Deck B should be aleph-wp-cache');
  assert(config.casos?.length >= 3, 'casos list missing');

  console.log('5. REST /api/aleph/anchors...');
  const anchors = await fetchJson(`${base}/api/aleph/anchors`);
  assert(anchors.grid?.cells?.length === 24, `expected 24 anchor cells, got ${anchors.grid?.cells?.length}`);
  assert(anchors.cacheStats?.registro_count > 0, 'cacheStats missing');
  const p03Cell = anchors.grid.cells.find(c => c.nodo_id === 'P03');
  assert(p03Cell?.wp_year === 2006, 'P03 anchor should expose wp_year 2006');
  assert(p03Cell?.year === 850, 'P03 playhead year should be año_ini 850');

  console.log('6. REST /api/aleph/registros/1000...');
  const registros1000 = await fetchJson(`${base}/api/aleph/registros/${TEST_YEAR_HIST}`);
  assert(registros1000.nodo?.id === 'P03', 'REST registros 1000 → P03');
  assert(registros1000.total > 0, 'REST registros 1000 should be non-empty');

  console.log('7. REST /api/aleph/medicion/aeo-p24-linea...');
  const medicion = await fetchJson(`${base}/api/aleph/medicion/aeo-p24-linea`);
  assert(medicion.latest?.id === 'M8' || medicion.latest?.intensidad, 'M8 or latest intensidad expected');

  console.log('8. REST /api/aleph/topology...');
  const topo = await fetchJson(`${base}/api/aleph/topology`);
  assert(topo.nodes?.length >= 2, 'topology nodes missing');
  assert(topo.lanes?.composer?.length > 0, 'composer lane missing');

  console.log('9. Socket deck load + playhead 1000 + 2026...');
  client = ioClient(`${base}/session`);
  const initialState = waitForEvent(client, 'session:state');
  await new Promise((res, rej) => {
    client.on('connect', res);
    client.on('connect_error', rej);
  });
  await initialState;

  const waitResolved = (deckId, predicate, timeoutMs = 12000) =>
    waitForEvent(client, 'deck:resolved', (p) => {
      if (p.deckId !== deckId) return false;
      return predicate ? predicate(p) : true;
    }, timeoutMs);

  const loadedA = waitResolved('A', p => p.nodo?.nodo?.id || p.nodo?.id);
  client.emit('deck:load', { deckId: 'A', serverName: 'linea-espana', presetId: presetA.id });
  const resolvedA = await loadedA;
  assert(resolvedA.nodo?.nodo?.id || resolvedA.nodo?.id, 'deck A nodo missing at initial load');

  const loadedB = waitResolved('B', p => p.nodo?.nodo?.id || p.nodo?.id);
  client.emit('deck:load', { deckId: 'B', serverName: 'linea-wp-historia', presetId: presetB.id });
  await loadedB;

  const resolvedB1000Promise = waitResolved(
    'B',
    p => p.year === TEST_YEAR_HIST && p.registros?.total > 0,
    12000
  );
  client.emit('playhead:set', { year: TEST_YEAR_HIST });
  const resolvedB1000 = await resolvedB1000Promise;

  assert(resolvedB1000.registros?.total > 0, 'deck B registros at 1000 should be non-empty');
  assert(
    resolvedB1000.nodo?.nodo?.id === 'P03' || resolvedB1000.nodo?.id === 'P03',
    'deck B nodo at 1000 should be P03'
  );
  assert(!resolvedB1000.registros?.error, 'deck B should not show coverage error at 1000');
  assert(!resolvedB1000.oldid?.error, 'deck B bridge preset should not call linea-oldid');

  const resolvedB2026Promise = waitResolved(
    'B',
    p => p.year === TEST_YEAR && (p.nodo?.nodo?.id === 'P24' || p.nodo?.id === 'P24'),
    12000
  );
  client.emit('playhead:set', { year: TEST_YEAR });
  const resolvedB2026 = await resolvedB2026Promise;

  assert(resolvedB2026.deckId === 'B', 'deck B mismatch');
  assert(resolvedB2026.registros?.total > 0, 'deck B registros at 2026');
  assert(
    resolvedB2026.nodo?.nodo?.id === 'P24' || resolvedB2026.nodo?.id === 'P24',
    'deck B nodo at 2026 should be P24'
  );

  const selectedBPromise = waitResolved('B', p => p.selected?.oldid != null || p.wikitext);
  client.emit('registro:select', { deckId: 'B', oldid: resolvedB2026.registros?.anchor?.oldid });
  const selectedB = await selectedBPromise;
  assert(selectedB.wikitext?.cached === true || selectedB.wikitext?.action?.tool === 'cache_wikitext', 'wikitext on select');

  console.log('\nTablero ALEPH e2e: OK');
} catch (err) {
  console.error('\nTablero ALEPH e2e: FAILED');
  console.error(err);
  process.exitCode = 1;
} finally {
  lineaServers.espana.port = origPorts.espana;
  lineaServers.wpHistoria.port = origPorts.wpHistoria;
  await shutdownE2E({ lineaHandles, player, sockets: client ? [client] : [] });
  fs.rmSync(dataDir, { recursive: true, force: true });
  if (process.exitCode) process.exit(process.exitCode);
}
