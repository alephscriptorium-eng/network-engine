import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import {
  PresetStore,
  discoverServers,
  syncDiscoveredServers,
  resolveDiscoverySources,
  DEFAULT_ZEUS_DISCOVERY,
  ServerRegistry,
  createPresetService,
  sanitizeSlug,
  buildManifest,
  buildReadme,
  exportPresetBundle,
  MCPToolsExtractor,
  createCatalogService,
  applyPresetFilter
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
  assert.deepEqual(manifest.itemsCount, { tools: 1, resources: 1, resourceTemplates: 0, prompts: 0, total: 2 });
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

  // 2b. resolveDiscoverySources merge
  step('resolveDiscoverySources');

  const mergeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presets-sdk-discovery-'));
  fs.writeFileSync(
    path.join(mergeDir, 'zeus-discovery.json'),
    JSON.stringify({ urls: ['http://localhost:4999'], timeoutMs: 3000 }),
    'utf8'
  );

  const merged = resolveDiscoverySources({
    dataDir: mergeDir,
    localDiscovery: { urls: ['http://localhost:5000'], timeoutMs: 1500 }
  });
  assert.ok(merged.urls.includes('http://localhost:4101'), 'includes SDK default');
  assert.ok(merged.urls.includes('http://localhost:4999'), 'includes shared file');
  assert.ok(merged.urls.includes('http://localhost:5000'), 'includes local override');
  assert.equal(merged.timeoutMs, 1500, 'local timeout wins');
  fs.rmSync(mergeDir, { recursive: true, force: true });

  const defaultsOnly = resolveDiscoverySources({});
  assert.deepEqual(defaultsOnly.urls, DEFAULT_ZEUS_DISCOVERY.urls);
  assert.equal(defaultsOnly.timeoutMs, DEFAULT_ZEUS_DISCOVERY.timeoutMs);

  console.log('resolveDiscoverySources: OK');

  // 2c. syncDiscoveredServers + disconnectMissing
  step('syncDiscoveredServers');

  const healthServer2 = http.createServer((req, res) => {
    if (req.url === '/mcp/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'test-moon' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => healthServer2.listen(0, '127.0.0.1', resolve));
  const healthUrl2 = `http://127.0.0.1:${healthServer2.address().port}`;

  const syncMockRegistry = {
    extractors: new Map([['stale-server', { disconnect: async () => {} }]]),
    knownServers: new Map([['stale-server', { url: 'http://127.0.0.1:9', transport: 'http' }]]),
    failedServers: new Map(),
    async disconnectMissing(keepNames) {
      const keep = new Set(keepNames);
      const pruned = [];
      for (const [name] of [...this.extractors.entries()]) {
        if (!keep.has(name)) {
          this.extractors.delete(name);
          pruned.push(name);
        }
      }
      return pruned;
    },
    async registerServerSafe(name, url, transport) {
      return { serverName: name, connected: true, url, transport };
    }
  };

  let catalogRefreshed = false;
  const mockCatalogForSync = { refreshCatalog: async () => { catalogRefreshed = true; } };

  try {
    const syncResult = await syncDiscoveredServers(
      syncMockRegistry,
      { urls: [healthUrl2], timeoutMs: 1500 },
      { catalog: mockCatalogForSync, pruneStale: true, registerMode: 'safe' }
    );
    assert.equal(syncResult.found.length, 1);
    assert.equal(syncResult.found[0].name, 'test-moon');
    assert.deepEqual(syncResult.pruned, ['stale-server']);
    assert.equal(syncResult.registered.length, 1);
    assert.equal(catalogRefreshed, true);
    console.log('syncDiscoveredServers: OK');
  } finally {
    await new Promise(resolve => healthServer2.close(resolve));
  }

  const realRegistry = new ServerRegistry();
  realRegistry.extractors.set('gone', {
    disconnect: async () => {}
  });
  realRegistry.knownServers.set('gone', { url: 'http://127.0.0.1:9', transport: 'http' });
  const pruned = await realRegistry.disconnectMissing(['other']);
  assert.deepEqual(pruned, ['gone']);
  assert.equal(realRegistry.extractors.has('gone'), false);
  assert.equal(realRegistry.failedServers.get('gone')?.error, 'not responding');
  await realRegistry.close();

  console.log('registry.disconnectMissing: OK');

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

    // create via canonical body, read back via rich routes
    const setRes = await fetch(`${base}/api/mcp/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-preset',
        items: [{ serverName: 'sun', type: 'tool', name: 'get_position' }]
      })
    });
    assert.equal(setRes.status, 200);
    const setBody = await setRes.json();
    assert.equal(setBody.success, true);
    assert.equal(setBody.preset.name, 'test-preset');
    assert.deepEqual(setBody.preset.itemsCount, { tools: 1, resources: 0, resourceTemplates: 0, prompts: 0, total: 1 });

    const badSet = await fetch(`${base}/api/mcp/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'bad', items: 'nope' })
    });
    assert.equal(badSet.status, 400, 'invalid items rejected with 400');

    const legacySet = await fetch(`${base}/api/mcp/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetName: 'old-shape',
        selectedItems: [{ serverName: 'sun', type: 'tool', name: 'get_position' }]
      })
    });
    assert.equal(legacySet.status, 400, 'legacy presetName/selectedItems rejected with 400');

    const one = await (await fetch(`${base}/api/mcp/preset/test-preset`)).json();
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

  // 4. MCPToolsExtractor.readResource (mock client)
  step('MCPToolsExtractor.readResource');

  const extractor = new MCPToolsExtractor();
  extractor.isConnected = true;
  extractor.client = {
    readResource: async ({ uri }) => ({
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ uri, ok: true }) }]
    })
  };

  const readResult = await extractor.readResource('body://info');
  assert.ok(readResult.contents, 'readResource returns contents');
  assert.equal(readResult.contents[0].uri, 'body://info');

  await assert.rejects(() => extractor.readResource(''), /uri is required/);

  extractor.client = {};
  await assert.rejects(() => extractor.readResource('body://info'), /does not support readResource/);

  console.log('MCPToolsExtractor.readResource: OK');

  // 5. createCatalogService
  step('createCatalogService');

  const mockCatalog = [{
    serverName: 'sun',
    serverInfo: { name: 'Sun Server', url: 'http://127.0.0.1:4101' },
    isConnected: true,
    tools: [{ name: 'get_position', description: 'pos', parameters: {}, type: 'tool' }],
    resources: [{ name: 'body-info', description: 'info', uri: 'body://info', mimeType: 'application/json', type: 'resource' }],
    resourceTemplates: [{ name: 'body-position', description: 'tpl', uriTemplate: 'body://position/{timestamp}', mimeType: 'application/json', type: 'resourceTemplate' }],
    prompts: [{ name: 'report-status', description: 'report', arguments: [], type: 'prompt' }]
  }];

  let buildCount = 0;
  const mockRegistry = {
    buildCatalog: async () => {
      buildCount++;
      return mockCatalog;
    }
  };

  const catalogService = createCatalogService({ registry: mockRegistry, cacheTtlMs: 60000 });
  const servers = await catalogService.getAllServers();
  assert.equal(servers.length, 1);
  assert.equal(servers[0].id, 'sun');
  assert.equal(servers[0].status, 'connected');

  const tools = await catalogService.getServerTools('sun');
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, 'get_position');

  const missing = await catalogService.getServerTools('moon');
  assert.equal(missing, null);

  await catalogService.getCatalog();
  await catalogService.getCatalog();
  assert.equal(buildCount, 1, 'catalog cached within TTL');

  await catalogService.refreshCatalog();
  assert.equal(buildCount, 2, 'refreshCatalog forces rebuild');

  console.log('createCatalogService: OK');

  // 6. applyPresetFilter
  step('applyPresetFilter');

  const serverEntry = mockCatalog[0];
  const preset = {
    name: 'observer',
    items: [
      { serverName: 'sun', type: 'tool', name: 'get_position' },
      { serverName: 'sun', type: 'resource', name: 'body-info' },
      { serverName: 'moon', type: 'tool', name: 'ignored' }
    ]
  };

  const filtered = applyPresetFilter(serverEntry, preset);
  assert.equal(filtered.tools.length, 1);
  assert.equal(filtered.resources.length, 1);
  assert.equal(filtered.resourceTemplates.length, 0);
  assert.equal(filtered.prompts.length, 0);

  const unfiltered = applyPresetFilter(serverEntry, null);
  assert.equal(unfiltered.tools.length, 1);
  assert.equal(unfiltered.resourceTemplates.length, 1);

  assert.equal(applyPresetFilter(null, preset), null);

  console.log('applyPresetFilter: OK');

  console.log('\nAll smoke tests passed.');

} catch (error) {
  failed = true;
  console.error('\nSmoke test FAILED:', error);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
