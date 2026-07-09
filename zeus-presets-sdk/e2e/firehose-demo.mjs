/**
 * E2E firehose-view-ui: volume resolve, browse, normalize, stats, focus.
 * Runs against real VOLUMES/DISK_01/FIREHOSE data.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVolume, browseVolume } from '@zeus/presets-sdk';
import { normalizeFirehosePost, browseCorpus, listPosts, getFirehoseStats } from '@zeus/linea-firehose';
import { createFirehoseServer } from '../packages/firehose-view-ui/src/server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIREHOSE_PORT = 13016;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status} for ${url}`);
  return data;
}

let server = null;

try {
  console.log('1. resolveVolume(firehose)...');
  const volume = resolveVolume('firehose');
  assert(fs.existsSync(volume.absPath), `absPath missing: ${volume.absPath}`);
  assert(volume.absPath.replace(/\\/g, '/').includes('DISK_01/FIREHOSE'), 'expected DISK_01/FIREHOSE path');

  console.log('2. browseVolume candidate/ (batch dirs)...');
  const rootBrowse = await browseVolume('firehose', 'candidate');
  assert(rootBrowse.entries.length > 0, 'candidate root empty');
  assert(rootBrowse.entries.some((e) => e.type === 'dir'), 'expected batch directories in candidate/');

  const batchDir = rootBrowse.entries.find((e) => e.type === 'dir');
  console.log(`3. browse batch ${batchDir.name}...`);
  const batchBrowse = await browseCorpus('candidate', batchDir.name);
  assert(batchBrowse.entries.length > 0, 'batch dir empty');
  const jsonEntry = batchBrowse.entries.find((e) => e.type === 'file' && e.name.endsWith('_simple-rule.json'));
  assert(jsonEntry, 'expected {eventId}_simple-rule.json in batch');

  console.log('4. normalize post from real JSON...');
  const posts = await listPosts('candidate', batchDir.name, { recursive: false, limit: 5 });
  assert(posts.posts.length > 0, 'no posts in batch');
  const post = posts.posts[0];
  assert(post.handle, 'post missing handle');
  assert(post.text, 'post missing text');

  const normalized = normalizeFirehosePost(post.raw);
  assert(normalized.handle, 'normalizeFirehosePost missing handle');
  assert(normalized.text, 'normalizeFirehosePost missing text');

  console.log('5. stats corpora counts...');
  const stats = getFirehoseStats();
  assert(stats.totals.candidate === 605, `candidate count ${stats.totals.candidate} !== 605`);
  assert(stats.totals.raw === 4076, `raw count ${stats.totals.raw} !== 4076`);
  assert(stats.totals.discarded === 3706, `discarded count ${stats.totals.discarded} !== 3706`);
  assert(stats.totals.labeled === 0, `labeled count ${stats.totals.labeled} !== 0`);

  console.log('6. Starting firehose-view-ui...');
  server = await createFirehoseServer({ port: FIREHOSE_PORT, host: 'localhost' });
  const base = `http://localhost:${FIREHOSE_PORT}`;

  console.log('7. GET /health...');
  const health = await fetchJson(`${base}/health`);
  assert(health.service === 'firehose-view-ui', 'health service mismatch');

  console.log('8. GET /api/corpora...');
  const corpora = await fetchJson(`${base}/api/corpora`);
  assert(corpora.corpora?.length === 4, 'expected 4 corpora');

  console.log('9. GET /api/stats...');
  const apiStats = await fetchJson(`${base}/api/stats`);
  assert(apiStats.totals.candidate === 605, 'api stats candidate mismatch');

  console.log('10. GET /api/browse candidate root...');
  const apiBrowse = await fetchJson(`${base}/api/browse?corpus=candidate&path=`);
  assert(apiBrowse.entries.some((e) => e.type === 'directory'), 'api browse missing batch dirs');

  console.log('11. GET /api/posts in batch...');
  const apiPosts = await fetchJson(
    `${base}/api/posts?corpus=candidate&path=${encodeURIComponent(batchDir.name)}&limit=3`
  );
  assert(apiPosts.posts?.length > 0, 'api posts empty');
  assert(apiPosts.posts[0].handle && apiPosts.posts[0].text, 'api post missing handle/text');

  console.log('12. GET /api/triage...');
  const triage = await fetchJson(`${base}/api/triage`);
  assert(triage.manifest?.timestamp, 'triage manifest missing timestamp');

  console.log('13. GET /api/file JSON...');
  const apiFile = await fetchJson(
    `${base}/api/file?corpus=candidate&path=${encodeURIComponent(jsonEntry.path)}`
  );
  assert(apiFile.kind === 'json', 'file kind should be json');
  assert(apiFile.data?.handle, 'file data missing handle');

  console.log('14. GET /api/focus...');
  const focus = await fetchJson(`${base}/api/focus`);
  assert(focus.focus?.corpus, 'focus corpus missing');

  console.log('15. labeled empty state via API...');
  const labeledPosts = await fetchJson(`${base}/api/posts?corpus=labeled&path=`);
  assert(labeledPosts.empty === true || labeledPosts.posts.length === 0, 'labeled should be empty');

  console.log('16. GET / (HTML)...');
  const htmlRes = await fetch(`${base}/?corpus=candidate`);
  assert(htmlRes.ok, 'HTML page failed');
  const html = await htmlRes.text();
  assert(html.includes('firehose-browser.js'), 'firehose-browser script missing');
  assert(html.includes('shell.js'), 'shell.js missing');
  assert(html.includes('Firehose Explorer'), 'page title missing');
  assert(html.includes('micropost-list.js'), 'micropost-list script missing');

  console.log('\nfirehose e2e OK');
} finally {
  if (server) await server.close();
}
