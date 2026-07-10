/**
 * Smoke test for player-ui-debug MCP monitor.
 * Starts in-process (headless), verifies health, snapshot, tools, and prompts.
 */

import assert from 'node:assert/strict';
import { connectMcp, toolResultJson } from '@zeus/test-utils';
import { resolveZeusUiPorts } from '@zeus/presets-sdk';
import { startAll } from '../src/start-all.mjs';

const TEST_MCP_PORT = 13014;

const SESSION_TOOLS = [
  'bootstrap_decks',
  'goto_parte',
  'goto_anchor',
  'goto_year',
  'ensure_wikitext',
  'select_caso',
  'wait_for_session',
  'session_report'
];

async function connect(port) {
  return connectMcp(port);
}

async function isPlayerUiUp() {
  const { host, port } = resolveZeusUiPorts().player;
  try {
    const res = await fetch(`http://${host}:${port}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

let handle = null;
const clients = [];
let failed = false;

try {
  handle = await startAll({ headless: true, mcpPort: TEST_MCP_PORT });
  console.log(`Started player-ui-debug MCP on port ${TEST_MCP_PORT}`);

  const healthRes = await fetch(`http://localhost:${TEST_MCP_PORT}/mcp/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.server, 'player-ui-debug');
  assert.deepEqual(health.capabilities, { tools: 24, resources: 9, resourceTemplates: 4, prompts: 5 });
  console.log('Health check OK:', JSON.stringify(health.capabilities));

  const mcp = await connect(TEST_MCP_PORT);
  clients.push(mcp);

  const info = await mcp.readResource({ uri: 'player://info' });
  const infoJson = JSON.parse(info.contents[0].text);
  assert.equal(infoJson.name, 'player-ui-debug');
  assert.equal(infoJson.mcpPort, TEST_MCP_PORT);
  console.log('Resource OK: player://info');

  const snapshot = toolResultJson(await mcp.callTool({ name: 'getResourceByUri', arguments: { uri: 'player://snapshot' } }));
  assert.equal(snapshot.schemaVersion, '1.0');
  assert.ok(snapshot.monitor, 'snapshot should have monitor');
  assert.ok(snapshot.health, 'snapshot should have health');
  assert.ok(snapshot.infrastructure, 'snapshot should have infrastructure');
  assert.ok(Array.isArray(snapshot.events), 'snapshot should have events array');
  console.log('Resource OK: player://snapshot');

  const playhead = toolResultJson(await mcp.callTool({ name: 'set_playhead', arguments: { year: 1300 } }));
  assert.equal(playhead.year, 1300);
  assert.equal(typeof playhead.ok, 'boolean');
  console.log(`Tool OK: set_playhead year=1300 ok=${playhead.ok}`);

  const refreshed = toolResultJson(await mcp.callTool({ name: 'refresh_snapshot', arguments: {} }));
  assert.equal(refreshed.schemaVersion, '1.0');
  console.log('Tool OK: refresh_snapshot');

  const report = toolResultJson(await mcp.callTool({ name: 'session_report', arguments: {} }));
  assert.equal(report.action, 'session_report');
  assert.ok(report.report, 'session_report should include report');
  console.log('Tool OK: session_report');

  const tools = await mcp.listTools();
  const toolNames = tools.tools.map((t) => t.name);
  for (const name of SESSION_TOOLS) {
    assert.ok(toolNames.includes(name), `missing session tool: ${name}`);
  }
  console.log(`Session tools OK: ${SESSION_TOOLS.length} registered`);

  const deckA = toolResultJson(
    await mcp.callTool({ name: 'getResourceByUri', arguments: { uri: 'player://deck/A' } })
  );
  assert.equal(deckA.deckId, 'A');
  assert.ok('phase' in deckA);
  console.log('Template OK: player://deck/A');

  const snapshotAt = toolResultJson(
    await mcp.callTool({
      name: 'getResourceByUri',
      arguments: { uri: 'player://snapshot/at/session' }
    })
  );
  assert.equal(snapshotAt.path, 'session');
  assert.ok(Array.isArray(snapshotAt.children));
  console.log('Template OK: player://snapshot/at/session');

  const restSnap = await fetch(`http://localhost:${TEST_MCP_PORT}/snapshot`);
  assert.equal(restSnap.status, 200);
  const restSnapJson = await restSnap.json();
  assert.equal(restSnapJson.schemaVersion, '1.0');
  console.log('REST OK: GET /snapshot');

  const restAt = await fetch(`http://localhost:${TEST_MCP_PORT}/snapshot/at?path=session`);
  assert.equal(restAt.status, 200);
  const restAtJson = await restAt.json();
  assert.ok(Array.isArray(restAtJson.children));
  console.log('REST OK: GET /snapshot/at');

  const inspectTool = toolResultJson(
    await mcp.callTool({ name: 'session_inspect', arguments: { path: 'session' } })
  );
  assert.equal(inspectTool.path, 'session');
  console.log('Tool OK: session_inspect');

  const prompts = await mcp.listPrompts();
  assert.equal(prompts.prompts.length, 5);
  const promptNames = prompts.prompts.map((p) => p.name).sort();
  assert.deepEqual(promptNames, [
    'diagnose-deck',
    'explore-monitor',
    'pinch-session',
    'report-session',
    'sync-with-operator'
  ]);
  console.log('Prompt catalog OK: 5 prompts');

  const bridgePrompts = toolResultJson(await mcp.callTool({ name: 'getPrompts', arguments: {} }));
  assert.equal(bridgePrompts.prompts.length, 5);
  console.log('Prompt bridge OK: getPrompts');

  if (await isPlayerUiUp()) {
    const gotoParte = toolResultJson(
      await mcp.callTool({ name: 'goto_parte', arguments: { parteId: 'IV', timeoutMs: 10000 } })
    );
    assert.equal(gotoParte.parteId, 'IV');
    assert.equal(gotoParte.year, 1978);
    console.log(`Integration OK: goto_parte IV ok=${gotoParte.ok} year=${gotoParte.year}`);
  } else {
    const { port: playerPort } = resolveZeusUiPorts().player;
    console.log(`Integration SKIP: player-ui :${playerPort} not running`);
  }

  console.log('SMOKE TEST PASSED');
} catch (err) {
  failed = true;
  console.error('SMOKE TEST FAILED');
  console.error(err);
} finally {
  await Promise.allSettled(clients.map((c) => c.close()));
  await handle?.close?.();
}

process.exit(failed ? 1 : 0);
