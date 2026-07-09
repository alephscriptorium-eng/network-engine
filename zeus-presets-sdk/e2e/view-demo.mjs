/**
 * E2E view-ui: lineas registry, browse, file read, stats, anchors, focus.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLineasBasePath } from '@zeus/presets-sdk';
import { createViewServer } from '../packages/view-ui/src/server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lineasBase = resolveLineasBasePath();

const VIEW_PORT = 13015;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status} for ${url}`);
  return data;
}

let view = null;

try {
  console.log('1. Starting view-ui...');
  view = await createViewServer({
    port: VIEW_PORT,
    host: 'localhost',
    basePath: lineasBase
  });

  const base = `http://localhost:${VIEW_PORT}`;

  console.log('2. GET /health...');
  const health = await fetchJson(`${base}/health`);
  assert(health.service === 'view-ui', 'health service mismatch');

  console.log('3. GET /api/lineas...');
  const lineas = await fetchJson(`${base}/api/lineas`);
  assert(lineas.lineas?.length >= 1, 'expected at least one linea');
  assert(lineas.lineas.some((l) => l.id === 'espana'), 'espana linea missing');

  console.log('4. GET /api/browse (root)...');
  const rootBrowse = await fetchJson(`${base}/api/browse?linea=espana&path=`);
  assert(rootBrowse.entries?.length > 0, 'root browse empty');
  assert(rootBrowse.entries.some((e) => e.name === 'manifest.json'), 'manifest.json missing in root');

  console.log('5. GET /api/file manifest.json...');
  const manifest = await fetchJson(`${base}/api/file?linea=espana&path=manifest.json`);
  assert(manifest.viewer === 'object-explorer', 'manifest should use object-explorer');
  assert(manifest.kind === 'json', 'manifest kind should be json');
  assert(manifest.data?.nodos?.length > 0, 'manifest nodos missing');

  console.log('5b. GET /api/focus after manifest...');
  const focusAfterManifest = await fetchJson(`${base}/api/focus`);
  assert(focusAfterManifest.focus?.path === 'manifest.json', 'focus path should be manifest.json');

  console.log('6. Browse satellite cache dir...');
  const manifestSat = manifest.data?.meta?.satelite_wp || 'wp-historia';
  const cachePath = `${manifestSat}/cache/snapshots`;
  const cacheBrowse = await fetchJson(
    `${base}/api/browse?linea=espana&path=${encodeURIComponent(cachePath)}`
  );
  const wikitextEntry = cacheBrowse.entries?.find((e) => e.ext === '.wikitext');
  if (wikitextEntry) {
    console.log('7. GET /api/file wikitext...');
    const wt = await fetchJson(
      `${base}/api/file?linea=espana&path=${encodeURIComponent(wikitextEntry.path)}`
    );
    assert(wt.viewer === 'text-plain', 'wikitext viewer mismatch');
    assert(wt.kind === 'wikitext', 'wikitext kind mismatch');
    assert(typeof wt.data === 'string' && wt.data.length > 0, 'wikitext body empty');
  } else {
    console.log('7. SKIP wikitext (no cached snapshots on disk)');
  }

  console.log('8. GET /api/stats...');
  const stats = await fetchJson(`${base}/api/stats?linea=espana`);
  assert(stats.stats?.registro_count != null, 'stats registro_count missing');

  console.log('9. GET /api/anchors...');
  const anchors = await fetchJson(`${base}/api/anchors?linea=espana`);
  assert(anchors.cells?.length > 0, 'anchor grid empty');
  assert(anchors.summary?.total > 0, 'anchor summary missing');

  console.log('10. GET /api/focus (latest)...');
  const focus = await fetchJson(`${base}/api/focus`);
  assert(focus.focus?.path, 'focus path should be set');

  console.log('11. Path traversal guard...');
  const bad = await fetch(`${base}/api/file?linea=espana&path=${encodeURIComponent('../../package.json')}`);
  assert(bad.status >= 400, 'traversal should be rejected');

  console.log('12. GET / (HTML)...');
  const htmlRes = await fetch(`${base}/?linea=espana&path=manifest.json`);
  assert(htmlRes.ok, 'HTML page failed');
  const html = await htmlRes.text();
  assert(html.includes('cache-browser.js'), 'cache-browser script missing');
  assert(html.includes('shell.js'), 'shell.js script missing');
  assert(html.includes('zeus-shell-header'), 'zeus shell header missing');
  assert(html.includes('Cache Explorer'), 'page title missing');

  console.log('13. GET /api/themes...');
  const themes = await fetchJson(`${base}/api/themes`);
  assert(Array.isArray(themes.themes), 'themes list missing');
  assert(themes.current, 'current theme missing');

  console.log('\nview-ui e2e OK');
} finally {
  if (view) await view.close();
}
