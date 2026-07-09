/**
 * E2E firehose-links: player GET /api/aleph/firehose-links → Firehose Explorer hrefs.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlayerServer } from '../packages/player-ui/src/server.mjs';
import { buildFirehoseLinksResponse, resolveUiMesh } from '@zeus/presets-sdk';

import { shutdownE2E } from './helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const PLAYER_PORT = 13017;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

let player = null;

try {
  console.log('1. buildFirehoseLinksResponse (in-process)...');
  const mesh = resolveUiMesh({
    dataDir: path.join(repoRoot, 'data'),
    localConfig: {},
    selfUiId: 'player'
  });
  const localPayload = await buildFirehoseLinksResponse({ firehoseEntry: mesh.uis.firehose });
  assert(localPayload.items?.length > 0, 'expected firehose link items');
  assert(localPayload.corpora?.length === 4, 'expected 4 corpora');
  const candidateItem = localPayload.items.find((i) => i.id === 'corpus-candidate');
  assert(candidateItem?.href?.includes(':3016'), 'candidate href should target firehose UI');
  assert(candidateItem.href.includes('corpus=candidate'), 'candidate href missing corpus param');

  console.log('2. Starting player-ui...');
  player = await createPlayerServer({
    port: PLAYER_PORT,
    host: 'localhost',
    dataDir: path.join(repoRoot, 'data'),
    discoveryUrls: []
  });

  const base = `http://localhost:${PLAYER_PORT}`;

  console.log('3. GET /api/aleph/firehose-links...');
  const payload = await fetchJson(`${base}/api/aleph/firehose-links`);
  assert(payload.volumeId === 'firehose', 'volumeId mismatch');
  assert(payload.items?.length > 0, 'API returned no items');
  assert(payload.items.some((i) => i.href?.includes('3016')), 'items missing firehose UI href');
  assert(payload.items.some((i) => i.kind === 'batch'), 'expected recent batch link');
  assert(payload.triage?.timestamp, 'expected triage timestamp in payload');

  console.log('4. labeled corpus link state...');
  const labeled = payload.corpora.find((c) => c.id === 'labeled');
  assert(labeled, 'labeled corpus missing');
  const labeledItem = payload.items.find((i) => i.id === 'corpus-labeled');
  if (labeled.empty) {
    assert(labeledItem?.disabled === true, 'labeled item should be disabled when empty');
  }

  console.log('\nfirehose-links e2e OK');
} finally {
  await shutdownE2E({ player });
}
