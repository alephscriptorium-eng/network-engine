/**
 * Smoke test for the solar-system MCP servers.
 * Starts all three servers in-process, then verifies:
 *   1. GET /mcp/health shape
 *   2. MCP client connection + tool/resource/template/prompt counts (7/2/2/4)
 *   3. get_position determinism, and sun fixed at origin vs earth
 *   4. body://info resource read
 *   5. Resource templates: listResourceTemplates + readResource cross-check
 *   6. Bridge tools: getResourcesUris, getResourceTemplates, getResourceByUri + errors
 */

import assert from 'node:assert/strict';
import { connectMcp, toolResultJson } from '@zeus/test-utils';
import { startAll } from '../src/start-all.mjs';

const FIXED_TIMESTAMP = 1700000000000;
const POSITION_URI = `body://position/${FIXED_TIMESTAMP}`;
const TEST_PORTS = { sun: 14101, moon: 14102, earth: 14103 };
const PREV_ENV = {
  sun: process.env.ZEUS_MCP_SUN,
  moon: process.env.ZEUS_MCP_MOON,
  earth: process.env.ZEUS_MCP_EARTH
};

process.env.ZEUS_MCP_SUN = String(TEST_PORTS.sun);
process.env.ZEUS_MCP_MOON = String(TEST_PORTS.moon);
process.env.ZEUS_MCP_EARTH = String(TEST_PORTS.earth);

async function connect(port) {
  return connectMcp(port);
}

let handles = [];
const clients = [];
let failed = false;

try {
  handles = await startAll();
  assert.equal(handles.length, 3);
  console.log('Started servers:', handles.map((h) => `${h.name}:${h.port}`).join(', '));

  // 1. Health endpoint shape (sun).
  const healthRes = await fetch('http://localhost:14101/mcp/health');
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.server, 'sun');
  assert.equal(health.name, 'sun');
  assert.equal(health.version, '1.0.0');
  assert.deepEqual(health.capabilities, {
    tools: 7,
    resources: 2,
    resourceTemplates: 2,
    prompts: 4
  });
  console.log('Health check OK:', JSON.stringify(health));

  // 2. MCP client: list tools/resources/templates/prompts on sun.
  const sun = await connect(14101);
  clients.push(sun);

  const tools = await sun.listTools();
  assert.equal(tools.tools.length, 7, `expected 7 tools, got ${tools.tools.length}`);
  assert.deepEqual(
    tools.tools.map((t) => t.name).sort(),
    [
      'getPrompt',
      'getPrompts',
      'getResourceByUri',
      'getResourceTemplates',
      'getResourcesUris',
      'get_position',
      'get_rotation'
    ]
  );

  const resources = await sun.listResources();
  assert.equal(resources.resources.length, 2, `expected 2 resources, got ${resources.resources.length}`);
  assert.deepEqual(resources.resources.map((r) => r.uri).sort(), ['body://info', 'server://card']);

  const templates = await sun.listResourceTemplates();
  assert.equal(
    templates.resourceTemplates.length,
    2,
    `expected 2 resource templates, got ${templates.resourceTemplates.length}`
  );
  assert.deepEqual(
    templates.resourceTemplates.map((t) => t.uriTemplate).sort(),
    ['body://position/{timestamp}', 'body://rotation/{timestamp}']
  );
  assert.deepEqual(
    templates.resourceTemplates.map((t) => t.name).sort(),
    ['body-position', 'body-rotation']
  );

  const prompts = await sun.listPrompts();
  assert.equal(prompts.prompts.length, 4, `expected 4 prompts, got ${prompts.prompts.length}`);
  const promptNames = prompts.prompts.map((p) => p.name).sort();
  assert.deepEqual(promptNames, ['compare-with', 'explore-server', 'position-report', 'report-status']);
  console.log('Catalog counts OK: 7 tools, 2 resources, 2 templates, 4 prompts');

  // 3. Determinism: same timestamp on earth twice must be identical.
  const earth = await connect(14103);
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

  // 5. Template read cross-check: readResource vs get_position on earth.
  const positionResource = await earth.readResource({ uri: POSITION_URI });
  const positionFromResource = JSON.parse(positionResource.contents[0].text);
  assert.deepEqual(
    positionFromResource,
    earthPos1,
    'readResource on body://position/{ts} must match get_position for the same timestamp'
  );
  assert.equal(positionResource.contents[0].uri, POSITION_URI);
  console.log('Template read OK: body://position cross-check with get_position');

  // 6. Resource bridge tools: getResourcesUris + getResourceByUri (fixed resources).
  const uriList = toolResultJson(await sun.callTool({ name: 'getResourcesUris', arguments: {} }));
  assert.equal(uriList.server, 'sun');
  assert.deepEqual(uriList.uris.sort(), ['body://info', 'server://card']);
  assert.equal(uriList.resources.length, 2);

  const viaTool = toolResultJson(
    await sun.callTool({ name: 'getResourceByUri', arguments: { uri: 'body://info' } })
  );
  assert.deepEqual(viaTool, infoJson, 'getResourceByUri must match readResource for body://info');
  console.log('Resource bridge tools OK: getResourcesUris + getResourceByUri (fixed)');

  // 7. Template bridge tools: getResourceTemplates + getResourceByUri (resolved template).
  const templateList = toolResultJson(
    await earth.callTool({ name: 'getResourceTemplates', arguments: {} })
  );
  assert.equal(templateList.server, 'earth');
  assert.deepEqual(templateList.uriTemplates.sort(), [
    'body://position/{timestamp}',
    'body://rotation/{timestamp}'
  ]);
  assert.equal(templateList.resourceTemplates.length, 2);

  const viaTemplateTool = toolResultJson(
    await earth.callTool({ name: 'getResourceByUri', arguments: { uri: POSITION_URI } })
  );
  assert.deepEqual(
    viaTemplateTool,
    earthPos1,
    'getResourceByUri must match readResource for resolved template URI'
  );
  console.log('Template bridge tools OK: getResourceTemplates + getResourceByUri');

  // 8. Error cases: invalid timestamp and unknown URI.
  const invalidTs = await earth.callTool({
    name: 'getResourceByUri',
    arguments: { uri: 'body://position/abc' }
  });
  assert.equal(invalidTs.isError, true, 'invalid template timestamp must be reported as MCP error');
  assert.match(invalidTs.content[0].text, /Invalid timestamp/);

  const badResult = await sun.callTool({
    name: 'getResourceByUri',
    arguments: { uri: 'file:///etc/passwd' }
  });
  assert.equal(badResult.isError, true, 'unknown URI must be reported as MCP error');
  assert.equal(badResult.content[0].type, 'text');
  assert.match(badResult.content[0].text, /Unknown resource URI/);
  assert.match(badResult.content[0].text, /body:\/\/info/);
  assert.match(badResult.content[0].text, /server:\/\/card/);
  assert.match(badResult.content[0].text, /body:\/\/position\/\{timestamp\}/);
  assert.match(badResult.content[0].text, /body:\/\/rotation\/\{timestamp\}/);
  console.log('Error cases OK: invalid timestamp and unknown URI');

  // 9. Verify each prompt renders coherent text with valid URIs.
  const explorePrompt = await sun.getPrompt({ name: 'explore-server', arguments: {} });
  assert.equal(explorePrompt.messages.length, 1);
  assert.equal(explorePrompt.messages[0].role, 'user');
  const exploreText = explorePrompt.messages[0].content.text;
  assert.match(exploreText, /body:\/\/info/);
  assert.match(exploreText, /server:\/\/card/);
  assert.match(exploreText, /body:\/\/position\/\{timestamp\}/);
  assert.match(exploreText, /get_position/);

  const statusPrompt = await sun.getPrompt({ name: 'report-status', arguments: { timestamp: '1700000000000' } });
  assert.equal(statusPrompt.messages.length, 1);
  const statusText = statusPrompt.messages[0].content.text;
  assert.match(statusText, /body:\/\/info/);
  assert.match(statusText, /body:\/\/position\/1700000000000/);
  assert.match(statusText, /body:\/\/rotation\/1700000000000/);
  assert.match(statusText, /get_position/);

  const positionPrompt = await earth.getPrompt({ name: 'position-report', arguments: { timestamp: '1700000000000' } });
  assert.equal(positionPrompt.messages.length, 1);
  const positionText = positionPrompt.messages[0].content.text;
  assert.match(positionText, /body:\/\/position\/1700000000000/);
  assert.match(positionText, /get_position/);
  assert.match(positionText, /AU/i);

  const comparePrompt = await earth.getPrompt({ name: 'compare-with', arguments: { other: 'sun', timestamp: '1700000000000' } });
  assert.equal(comparePrompt.messages.length, 1);
  const compareText = comparePrompt.messages[0].content.text;
  assert.match(compareText, /sun/);
  assert.match(compareText, /get_position/);
  assert.match(compareText, /4101|localhost:4101/);
  assert.match(compareText, /distance/i);
  console.log('Prompt rendering OK: all 4 prompts cite valid URIs and tools');

  // 10. Prompt bridge tools: getPrompts + getPrompt cross-check with native getPrompt.
  const promptList = toolResultJson(await sun.callTool({ name: 'getPrompts', arguments: {} }));
  assert.equal(promptList.server, 'sun');
  assert.equal(promptList.prompts.length, 4);
  assert.deepEqual(
    promptList.prompts.map((p) => p.name).sort(),
    promptNames
  );

  const exploreNative = await sun.getPrompt({ name: 'explore-server', arguments: {} });
  const exploreBridge = toolResultJson(
    await sun.callTool({ name: 'getPrompt', arguments: { name: 'explore-server' } })
  );
  assert.equal(exploreBridge.name, 'explore-server');
  assert.equal(exploreBridge.text, exploreNative.messages[0].content.text);

  const statusNative = await sun.getPrompt({
    name: 'report-status',
    arguments: { timestamp: '1700000000000' }
  });
  const statusBridge = toolResultJson(
    await sun.callTool({
      name: 'getPrompt',
      arguments: { name: 'report-status', arguments: { timestamp: '1700000000000' } }
    })
  );
  assert.equal(statusBridge.name, 'report-status');
  assert.equal(statusBridge.text, statusNative.messages[0].content.text);

  const badPrompt = await sun.callTool({
    name: 'getPrompt',
    arguments: { name: 'no-existe' }
  });
  assert.equal(badPrompt.isError, true, 'unknown prompt name must be reported as MCP error');
  assert.match(badPrompt.content[0].text, /Unknown prompt name/);
  assert.match(badPrompt.content[0].text, /explore-server/);
  console.log('Prompt bridge tools OK: getPrompts + getPrompt cross-check with native getPrompt');

  // Sequential reuse: one client, three consecutive tool calls on persistent McpServer.
  for (let i = 0; i < 3; i++) {
    const seqPos = toolResultJson(
      await sun.callTool({ name: 'get_position', arguments: { timestamp: FIXED_TIMESTAMP + i } })
    );
    assert.equal(seqPos.body, 'sun');
    assert.deepEqual(seqPos.position, { xAU: 0, yAU: 0 });
  }
  console.log('Sequential reuse OK: 3 consecutive get_position calls on one client');

  // Concurrent POST: mutex must serialize two parallel initialize requests.
  const initRequest = (id) => ({
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'concurrent-smoke', version: '1.0.0' }
    }
  });
  const mcpHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };
  const [concRes1, concRes2] = await Promise.all([
    fetch('http://localhost:14101/mcp', {
      method: 'POST',
      headers: mcpHeaders,
      body: JSON.stringify(initRequest(201))
    }),
    fetch('http://localhost:14101/mcp', {
      method: 'POST',
      headers: mcpHeaders,
      body: JSON.stringify(initRequest(202))
    })
  ]);
  assert.equal(concRes1.status, 200, 'first concurrent POST should return 200');
  assert.equal(concRes2.status, 200, 'second concurrent POST should return 200');
  console.log('Concurrent POST OK: two parallel initialize requests both succeed');

  console.log('SMOKE TEST PASSED');
} catch (err) {
  failed = true;
  console.error('SMOKE TEST FAILED');
  console.error(err);
} finally {
  if (PREV_ENV.sun == null) delete process.env.ZEUS_MCP_SUN;
  else process.env.ZEUS_MCP_SUN = PREV_ENV.sun;
  if (PREV_ENV.moon == null) delete process.env.ZEUS_MCP_MOON;
  else process.env.ZEUS_MCP_MOON = PREV_ENV.moon;
  if (PREV_ENV.earth == null) delete process.env.ZEUS_MCP_EARTH;
  else process.env.ZEUS_MCP_EARTH = PREV_ENV.earth;
  await Promise.allSettled(clients.map((c) => c.close()));
  await Promise.allSettled(handles.map((h) => h.close()));
}

process.exit(failed ? 1 : 0);
