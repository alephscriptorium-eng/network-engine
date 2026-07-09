/**
 * E2E Tablero Plato C: firehose-mcp discovery + deck C load + micropost resolve + contextual links.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as ioClient } from 'socket.io-client';
import { startFirehoseMcp } from '../packages/linea-firehose/src/start.mjs';
import { createPlayerServer } from '../packages/player-ui/src/server.mjs';
import { PresetStore } from '../packages/presets-sdk/src/preset-store.mjs';
import { assert, waitForEvent, shutdownE2E } from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const FIREHOSE_MCP_PORT = 13008;
const PLAYER_PORT = 13018;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

let firehoseMcp = null;
let player = null;
let client = null;

try {
  console.log('1. Seed ALEPH presets...');
  const { execSync } = await import('node:child_process');
  execSync('node scripts/seed-aleph-presets.mjs', { cwd: repoRoot, stdio: 'inherit' });

  const store = new PresetStore({ dataDir: path.join(repoRoot, 'data') });
  const presetC = store.getByName('aleph-firehose-browse');
  assert(presetC, 'aleph-firehose-browse missing — run seed:aleph');
  assert(
    presetC.items.some((i) => i.name === 'firehose_list_posts'),
    'aleph-firehose-browse should include firehose_list_posts tool'
  );

  console.log('2. Starting firehose-mcp-server...');
  firehoseMcp = await startFirehoseMcp({ port: FIREHOSE_MCP_PORT });
  const firehoseHealthUrl = `http://localhost:${FIREHOSE_MCP_PORT}/mcp/health`;
  const health = await fetchJson(firehoseHealthUrl);
  assert(health.server === 'firehose-mcp-server', 'firehose MCP health mismatch');

  console.log('3. Starting player-ui...');
  player = await createPlayerServer({
    port: PLAYER_PORT,
    host: 'localhost',
    dataDir: path.join(repoRoot, 'data'),
    discoveryUrls: [`http://localhost:${FIREHOSE_MCP_PORT}`]
  });

  const base = `http://localhost:${PLAYER_PORT}`;

  console.log('4. REST /api/aleph/config defaultPresets.C...');
  const config = await fetchJson(`${base}/api/aleph/config`);
  assert(config.defaultPresets?.C === 'aleph-firehose-browse', 'default Plato C preset mismatch');

  console.log('5. REST /api/aleph/topology includes firehose...');
  const topo = await fetchJson(`${base}/api/aleph/topology`);
  assert(topo.nodes?.some((n) => n.id === 'firehose-mcp-server'), 'topology missing firehose-mcp-server');
  assert(topo.nodes?.some((n) => n.id === 'firehose-view-ui'), 'topology missing firehose-view-ui');

  console.log('6. Socket deck:load C + deck:resolved...');
  client = ioClient(`${base}/session`);
  const initialState = waitForEvent(client, 'session:state', null, 15000);
  await new Promise((res, rej) => {
    client.on('connect', res);
    client.on('connect_error', rej);
  });
  await initialState;

  const waitResolved = (predicate, timeoutMs = 15000) =>
    waitForEvent(
      client,
      'deck:resolved',
      (p) => p.deckId === 'C' && (predicate ? predicate(p) : true),
      timeoutMs
    );

  const loadedC = waitResolved((p) => p.kind === 'firehose' && (p.posts?.items?.length ?? 0) > 0);
  client.emit('deck:load', {
    deckId: 'C',
    serverName: 'firehose-mcp-server',
    presetId: presetC.id
  });
  const resolvedC = await loadedC;

  assert(resolvedC.kind === 'firehose', 'deck C resolved.kind should be firehose');
  assert(resolvedC.posts?.items?.length > 0, 'deck C should list microposts');
  assert(resolvedC.selected?.filePath, 'deck C should auto-select first post');
  assert(resolvedC.stats?.totals?.candidate === 605, 'candidate count mismatch');

  console.log('7. micropost:select second post...');
  const second = resolvedC.posts.items[1] || resolvedC.posts.items[0];
  const selectedPromise = waitResolved(
    (p) => p.selected?.filePath === second.filePath
  );
  client.emit('micropost:select', {
    deckId: 'C',
    filePath: second.filePath,
    corpus: resolvedC.corpus,
    path: resolvedC.path
  });
  const selected = await selectedPromise;
  assert(selected.selected?.text, 'selected post should include text');

  console.log('8. GET /api/aleph/firehose-links with deck context...');
  const qs = new URLSearchParams({
    corpus: selected.corpus,
    path: selected.path || '',
    file: selected.selected.filePath
  });
  const links = await fetchJson(`${base}/api/aleph/firehose-links?${qs}`);
  assert(links.items?.some((i) => i.id === 'firehose-selection'), 'expected selection link item');
  const selection = links.items.find((i) => i.id === 'firehose-selection');
  assert(selection.href?.includes('3016'), 'selection href should target firehose UI');
  assert(selection.href.includes('corpus='), 'selection href missing corpus');

  console.log('9. firehose:corpus raw...');
  const rawPromise = waitResolved((p) => p.corpus === 'raw');
  client.emit('firehose:corpus', { deckId: 'C', corpus: 'raw', path: '' });
  const rawResolved = await rawPromise;
  assert(rawResolved.corpus === 'raw', 'corpus switch failed');

  console.log('\nfirehose-deck e2e OK');
} catch (err) {
  console.error('\nfirehose-deck e2e: FAILED');
  console.error(err);
  process.exitCode = 1;
} finally {
  await shutdownE2E({
    lineaHandles: firehoseMcp ? [firehoseMcp] : [],
    player,
    sockets: client ? [client] : []
  });
}
