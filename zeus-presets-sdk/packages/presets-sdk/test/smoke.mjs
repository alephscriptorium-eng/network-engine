import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import {
  PresetStore,
  discoverServers,
  createPresetService,
  sanitizeSlug,
  buildManifest,
  buildReadme,
  exportPresetBundle
} from '../src/index.mjs';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presets-sdk-smoke-'));
let failed = false;

function step(name) {
  console.log(`\n--- ${name} ---`);
}

try {
  // 1. PresetStore CRUD + persistence
  step('PresetStore CRUD');

  const store = new PresetStore({ dataDir: tempDir });
  assert.equal(store.count(), 0, 'store starts empty');

  const created = store.create({
    name: 'observer',
    description: 'watch the sky',
    category: 'Astronomy',
    prompt: 'observe',
    items: [
      { serverName: 'sun', type: 'tool', name: 'get_position' },
      { serverName: 'moon', type: 'resource', name: 'body-info' },
      { serverName: 'earth', type: 'prompt', name: 'report-status' }
    ]
  });
  assert.ok(created.id, 'created preset has id');
  assert.equal(created.category, 'Astronomy');
  assert.ok(created.createdAt && created.updatedAt, 'timestamps set');

  // defaults
  const minimal = store.create({ name: 'minimal', items: [] });
  assert.equal(minimal.description, '');
  assert.equal(minimal.category, 'General');
  assert.equal(minimal.prompt, '');

  // validation errors
  assert.throws(() => store.create({ items: [] }), /name is required/);
  assert.throws(
    () => store.create({ name: 'bad', items: [{ serverName: 'x', type: 'nope', name: 'y' }] }),
    /Invalid items format/
  );

  // lookups
  assert.equal(store.getById(created.id).name, 'observer');
  assert.equal(store.getByName('observer').id, created.id);
  assert.equal(store.getById('does-not-exist'), null);
  assert.equal(store.getByName('does-not-exist'), null);

  // update
  const updated = store.update(created.id, { description: 'updated', items: undefined });
  assert.equal(updated.description, 'updated');
  assert.ok(Array.isArray(updated.items), 'items stays an array after patch');
  assert.equal(updated.items.length, 0, 'explicit items:undefined normalizes to []');
  assert.equal(store.update('does-not-exist', {}), null);

  const patched = store.update(created.id, {
    items: [{ serverName: 'sun', type: 'tool', name: 'get_rotation' }]
  });
  assert.equal(patched.items.length, 1);

  // search
  assert.equal(store.search('OBSERVER').length, 1);
  assert.equal(store.search('general').length, 1);
  assert.equal(store.search('zzz').length, 0);

  // persistence across a second instance
  step('PresetStore persistence');
  const store2 = new PresetStore({ dataDir: tempDir });
  assert.equal(store2.count(), 2, 'second instance loads persisted presets');
  assert.equal(store2.getByName('observer').items[0].name, 'get_rotation');

  // remove
  assert.equal(store2.remove(created.id), true);
  assert.equal(store2.remove(created.id), false);
  const store3 = new PresetStore({ dataDir: tempDir });
  assert.equal(store3.count(), 1, 'removal persisted');

  // corrupt file tolerance
  const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presets-sdk-corrupt-'));
  fs.writeFileSync(path.join(corruptDir, 'presets.json'), '{not json', 'utf-8');
  const corruptStore = new PresetStore({ dataDir: corruptDir });
  assert.equal(corruptStore.count(), 0, 'corrupt file tolerated');
  fs.rmSync(corruptDir, { recursive: true, force: true });

  console.log('PresetStore: OK');

  // 1b. exportPresetBundle
  step('exportPresetBundle');

  const bundlePreset = {
    id: 'bundle-test-id',
    name: 'Solar System Observer!',
    description: 'Watch the sky',
    category: 'Astronomy',
    prompt: 'Observe all bodies',
    items: [
      { serverName: 'sun', type: 'tool', name: 'get_position' },
      { serverName: 'moon', type: 'resource', name: 'body-info' }
    ],
    createdAt: '2026-07-06T12:00:00.000Z',
    updatedAt: '2026-07-06T13:00:00.000Z'
  };

  assert.equal(sanitizeSlug('Solar System Observer!'), 'solar-system-observer');
  assert.equal(sanitizeSlug(''), 'preset');

  const manifest = buildManifest(bundlePreset);
  assert.equal(manifest.format, 'zeus-preset-bundle');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.presetName, bundlePreset.name);
  assert.equal(manifest.presetId, bundlePreset.id);
  assert.deepEqual(manifest.itemsCount, { tools: 1, resources: 1, prompts: 0, total: 2 });
  assert.ok(manifest.exportedAt);

  const readme = buildReadme(bundlePreset);
  assert.ok(readme.includes('# Solar System Observer!'));
  assert.ok(readme.includes('1 tools'));
  assert.ok(readme.includes('| sun | tool | get_position |'));

  const { filename, stream } = exportPresetBundle(bundlePreset);
  assert.equal(filename, 'solar-system-observer.preset.zip');

  const zipChunks = [];
  for await (const chunk of stream) {
    zipChunks.push(chunk);
  }
  const zipBuffer = Buffer.concat(zipChunks);
  assert.ok(zipBuffer.length > 100, 'zip has content');
  assert.equal(zipBuffer[0], 0x50);
  assert.equal(zipBuffer[1], 0x4b);
  assert.ok(zipBuffer.includes(Buffer.from('preset.json')));
  assert.ok(zipBuffer.includes(Buffer.from('manifest.json')));
  assert.ok(zipBuffer.includes(Buffer.from('README.md')));
  assert.ok(zipBuffer.includes(Buffer.from('solar-system-observer/preset.json')));

  console.log('exportPresetBundle: OK');

  // 2. discoverServers against a throwaway health server
  step('discoverServers');

  const healthServer = http.createServer((req, res) => {
    if (req.url === '/mcp/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'test-sun' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => healthServer.listen(0, '127.0.0.1', resolve));
  const healthPort = healthServer.address().port;
  const healthUrl = `http://127.0.0.1:${healthPort}`;

  try {
    const discovered = await discoverServers({
      urls: [healthUrl, 'http://127.0.0.1:1'], // second candidate refuses connections
      staticList: [{ name: 'static-one', url: 'http://example.invalid:9999' }],
      timeoutMs: 1500
    });

    const staticEntry = discovered.find(s => s.name === 'static-one');
    assert.ok(staticEntry, 'staticList entry passes through without probing');
    assert.equal(staticEntry.transport, 'http');

    const probed = discovered.find(s => s.url === healthUrl);
    assert.ok(probed, 'responding server is discovered');
    assert.equal(probed.name, 'test-sun', 'name derived from health response');
    assert.equal(probed.transport, 'http');

    assert.equal(
      discovered.find(s => s.url === 'http://127.0.0.1:1'),
      undefined,
      'non-responding candidate is excluded'
    );

    console.log('discoverServers: OK');
  } finally {
    await new Promise(resolve => healthServer.close(resolve));
  }

  // 3. createPresetService boots and mounts routes
  step('createPresetService');

  const serviceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presets-sdk-service-'));
  const service = await createPresetService({ port: 0, dataDir: serviceDir });

  try {
    const base = `http://127.0.0.1:${service.port}`;

    const health = await (await fetch(`${base}/health`)).json();
    assert.equal(health.status, 'ok');
    assert.equal(health.mode, 'preset-service');
    assert.equal(typeof health.ready, 'boolean');

    const presetsRes = await fetch(`${base}/api/mcp/presets`);
    assert.equal(presetsRes.status, 200);
    const presets = await presetsRes.json();
    assert.equal(presets.success, true);
    assert.deepEqual(presets.presets, []);
    assert.equal(presets.totalPresets, 0);

    // create via legacy body, read back via rich routes
    const setRes = await fetch(`${base}/api/mcp/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetName: 'legacy-preset',
        selectedItems: [{ serverName: 'sun', type: 'tool', name: 'get_position' }]
      })
    });
    assert.equal(setRes.status, 200);
    const setBody = await setRes.json();
    assert.equal(setBody.success, true);
    assert.equal(setBody.preset.name, 'legacy-preset');
    assert.deepEqual(setBody.preset.itemsCount, { tools: 1, resources: 0, prompts: 0, total: 1 });

    const badSet = await fetch(`${base}/api/mcp/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'bad', items: 'nope' })
    });
    assert.equal(badSet.status, 400, 'invalid items rejected with 400');

    const one = await (await fetch(`${base}/api/mcp/preset/legacy-preset`)).json();
    assert.equal(one.preset.category, 'General');

    const missing = await fetch(`${base}/api/mcp/preset/nope`);
    assert.equal(missing.status, 404);

    const del = await fetch(`${base}/api/mcp/preset/${one.preset.id}`, { method: 'DELETE' });
    assert.equal(del.status, 200);
    const delMissing = await fetch(`${base}/api/mcp/preset/${one.preset.id}`, { method: 'DELETE' });
    assert.equal(delMissing.status, 404);

    // /list works with an empty registry
    const list = await (await fetch(`${base}/api/mcp/list`)).json();
    assert.equal(list.success, true);
    assert.deepEqual(list.catalog, []);
    assert.equal(list.serversCount, 0);

    console.log('createPresetService: OK');
  } finally {
    await service.registry.close();
    await new Promise(resolve => service.server.close(resolve));
    fs.rmSync(serviceDir, { recursive: true, force: true });
  }

  console.log('\nAll smoke tests passed.');

} catch (error) {
  failed = true;
  console.error('\nSmoke test FAILED:', error);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
