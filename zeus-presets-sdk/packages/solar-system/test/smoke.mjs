/**
 * Smoke test for the solar-system MCP servers.
 * Starts all three servers in-process, then verifies:
 *   1. GET /mcp/health shape
 *   2. MCP client connection + tool/resource/prompt counts (4/2/1)
 *   3. get_position determinism, and sun fixed at origin vs earth
 *   4. body://info resource read
 */

import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startAll } from '../src/start-all.mjs';

const FIXED_TIMESTAMP = 1700000000000;

async function connect(port) {
  const client = new Client({ name: 'smoke-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`));
  await client.connect(transport);
  return client;
}

function toolResultJson(result) {
  assert.equal(result.content[0].type, 'text');
  return JSON.parse(result.content[0].text);
}

let handles = [];
const clients = [];
let failed = false;

try {
  handles = await startAll();
  assert.equal(handles.length, 3);
  console.log('Started servers:', handles.map((h) => `${h.name}:${h.port}`).join(', '));

  // 1. Health endpoint shape (sun).
  const healthRes = await fetch('http://localhost:4101/mcp/health');
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.server, 'sun');
  assert.equal(health.name, 'sun');
  assert.equal(health.version, '1.0.0');
  assert.deepEqual(health.capabilities, { tools: 4, resources: 2, prompts: 1 });
  console.log('Health check OK:', JSON.stringify(health));

  // 2. MCP client: list tools/resources/prompts on sun.
  const sun = await connect(4101);
  clients.push(sun);

  const tools = await sun.listTools();
  assert.equal(tools.tools.length, 4, `expected 4 tools, got ${tools.tools.length}`);
  assert.deepEqual(
    tools.tools.map((t) => t.name).sort(),
    ['getResourceByUri', 'getResourcesUris', 'get_position', 'get_rotation']
  );

  const resources = await sun.listResources();
  assert.equal(resources.resources.length, 2, `expected 2 resources, got ${resources.resources.length}`);
  assert.deepEqual(resources.resources.map((r) => r.uri).sort(), ['body://info', 'server://card']);

  const prompts = await sun.listPrompts();
  assert.equal(prompts.prompts.length, 1, `expected 1 prompt, got ${prompts.prompts.length}`);
  assert.equal(prompts.prompts[0].name, 'report-status');
  console.log('Catalog counts OK: 4 tools, 2 resources, 1 prompt');

  // 3. Determinism: same timestamp on earth twice must be identical.
  const earth = await connect(4103);
  clients.push(earth);

  const earthPos1 = toolResultJson(
    await earth.callTool({ name: 'get_position', arguments: { timestamp: FIXED_TIMESTAMP } })
  );
  const earthPos2 = toolResultJson(
    await earth.callTool({ name: 'get_position', arguments: { timestamp: FIXED_TIMESTAMP } })
  );
  assert.deepEqual(earthPos1, earthPos2, 'get_position must be deterministic for a fixed timestamp');
  assert.equal(earthPos1.body, 'earth');
  assert.equal(earthPos1.timestamp, FIXED_TIMESTAMP);
  assert.equal(earthPos1.orbitRadiusAU, 1.0);
  assert.ok(
    Math.hypot(earthPos1.position.xAU, earthPos1.position.yAU) > 0.99,
    'earth must be about 1 AU from the origin'
  );
  console.log('Determinism OK: earth position stable at fixed timestamp');

  // Sun must be at the origin regardless of timestamp.
  const sunPos = toolResultJson(
    await sun.callTool({ name: 'get_position', arguments: { timestamp: FIXED_TIMESTAMP } })
  );
  assert.equal(sunPos.body, 'sun');
  assert.deepEqual(sunPos.position, { xAU: 0, yAU: 0 }, 'sun must be at the origin');
  assert.notDeepEqual(earthPos1.position, sunPos.position, 'earth must not be at the origin');
  console.log('Origin OK: sun at (0, 0), earth away from origin');

  // 4. Read body://info on sun.
  const info = await sun.readResource({ uri: 'body://info' });
  const infoJson = JSON.parse(info.contents[0].text);
  assert.equal(infoJson.name, 'sun');
  assert.equal(infoJson.type, 'star');
  assert.equal(infoJson.radiusKm, 696340);
  console.log('Resource read OK: body://info for sun');

  // 5. Resource bridge tools: getResourcesUris + getResourceByUri.
  const uriList = toolResultJson(await sun.callTool({ name: 'getResourcesUris', arguments: {} }));
  assert.equal(uriList.body, 'sun');
  assert.deepEqual(uriList.uris.sort(), ['body://info', 'server://card']);
  assert.equal(uriList.resources.length, 2);

  const viaTool = toolResultJson(
    await sun.callTool({ name: 'getResourceByUri', arguments: { uri: 'body://info' } })
  );
  assert.deepEqual(viaTool, infoJson, 'getResourceByUri must match readResource for body://info');

  const badResult = await sun.callTool({
    name: 'getResourceByUri',
    arguments: { uri: 'file:///etc/passwd' }
  });
  assert.equal(badResult.isError, true, 'unknown URI must be reported as MCP error');
  assert.equal(badResult.content[0].type, 'text');
  assert.match(badResult.content[0].text, /Unknown resource URI/);
  assert.match(badResult.content[0].text, /body:\/\/info/);
  assert.match(badResult.content[0].text, /server:\/\/card/);
  console.log('Resource bridge tools OK: getResourcesUris + getResourceByUri');

  console.log('SMOKE TEST PASSED');
} catch (err) {
  failed = true;
  console.error('SMOKE TEST FAILED');
  console.error(err);
} finally {
  await Promise.allSettled(clients.map((c) => c.close()));
  await Promise.allSettled(handles.map((h) => h.close()));
}

process.exit(failed ? 1 : 0);
