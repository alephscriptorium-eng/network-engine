import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startAll } from '../packages/solar-system/src/start-all.mjs';
import {
  ServerRegistry,
  PresetStore,
  discoverServers
} from '../packages/presets-sdk/src/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data', 'e2e-run');
const FIXED_TS = 1_700_000_000_000;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

console.log('1. Starting solar-system servers...');
const instances = await startAll();

console.log('2. Discovery...');
const found = await discoverServers({
  urls: ['http://localhost:4101', 'http://localhost:4102', 'http://localhost:4103'],
  timeoutMs: 5000
});
assert(found.length === 3, `Expected 3 servers, got ${found.length}`);

console.log('3. Building catalog...');
const registry = new ServerRegistry();
for (const s of found) {
  await registry.registerServer(s.name, s.url, 'http');
}
const catalog = await registry.buildCatalog();
assert(catalog.length === 3, 'catalog servers');
const totalTools = catalog.reduce((n, s) => n + s.tools.length, 0);
const totalResources = catalog.reduce((n, s) => n + s.resources.length, 0);
const totalResourceTemplates = catalog.reduce((n, s) => n + (s.resourceTemplates?.length || 0), 0);
const totalPrompts = catalog.reduce((n, s) => n + s.prompts.length, 0);
assert(totalTools === 15, `Expected 15 tools, got ${totalTools}`);
assert(totalResources === 6, `Expected 6 resources, got ${totalResources}`);
assert(totalResourceTemplates === 6, `Expected 6 resource templates, got ${totalResourceTemplates}`);
assert(totalPrompts === 3, `Expected 3 prompts, got ${totalPrompts}`);

console.log('4. Creating solar-system-observer preset...');
const store = new PresetStore({ dataDir, fileName: 'presets.json' });
const items = [];
for (const server of catalog) {
  items.push(
    { serverName: server.serverName, type: 'resource', name: 'body-info' },
    { serverName: server.serverName, type: 'tool', name: 'get_position' },
    { serverName: server.serverName, type: 'tool', name: 'get_rotation' },
    { serverName: server.serverName, type: 'prompt', name: 'report-status' }
  );
}
items.push({ serverName: 'earth', type: 'resourceTemplate', name: 'body-position' });
store.create({
  name: 'solar-system-observer',
  description: 'Cross-server preset for reporting sun, moon, and earth state at a given timestamp',
  category: 'Analysis',
  prompt: 'Report the state of all three bodies at the given timestamp using their tools and resources.',
  items
});

console.log('5. Verifying persistence...');
const store2 = new PresetStore({ dataDir, fileName: 'presets.json' });
const loaded = store2.getByName('solar-system-observer');
assert(loaded && loaded.items.length === 13, 'preset persistence failed');

console.log('6. Simulating agent flow...');
const report = { timestamp: FIXED_TS, bodies: {} };
for (const serverName of ['sun', 'moon', 'earth']) {
  const extractor = registry.extractors.get(serverName);
  assert(extractor, `No extractor for ${serverName}`);
  const posResult = await extractor.callTool('get_position', { timestamp: FIXED_TS });
  const rotResult = await extractor.callTool('get_rotation', { timestamp: FIXED_TS });
  report.bodies[serverName] = {
    position: JSON.parse(posResult[0].text),
    rotation: JSON.parse(rotResult[0].text)
  };
}
assert(report.bodies.sun.position.position.xAU === 0, 'sun should be at origin');
assert(report.bodies.earth.position.position.xAU !== 0 || report.bodies.earth.position.position.yAU !== 0, 'earth should move');

console.log('7. Degraded case: stop moon server...');
const moon = instances.find((i) => i.name === 'moon');
await moon.close();
await new Promise((r) => setTimeout(r, 300));
const registry2 = new ServerRegistry();
for (const s of found) {
  await registry2.registerServerSafe(s.name, s.url, 'http');
}
const degraded = await registry2.buildCatalog();
const moonEntry = degraded.find((s) => s.serverName === 'moon');
assert(moonEntry && moonEntry.isConnected === false, 'moon should be disconnected');

console.log('8. Agent report sample:');
console.log(JSON.stringify({
  preset: loaded.name,
  timestamp: FIXED_TS,
  summary: Object.fromEntries(
    Object.entries(report.bodies).map(([k, v]) => [k, {
      xAU: v.position.position.xAU,
      yAU: v.position.position.yAU,
      rotationRad: v.rotation.rotationAngleRad
    }])
  )
}, null, 2));

await registry.close();
await registry2.close();
await Promise.all(instances.filter((i) => i.name !== 'moon').map((i) => i.close()));

console.log('\ne2e demo: OK');
