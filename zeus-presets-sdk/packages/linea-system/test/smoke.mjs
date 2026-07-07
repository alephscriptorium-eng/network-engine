/**
 * Smoke test for the linea-system MCP servers.
 * Starts both servers in-process, then verifies:
 *   1. GET /mcp/health shape
 *   2. year 1300 → P06 on linea-espana
 *   3. oldid resolution on linea-wp-historia
 *   4. empty explicit response outside WP coverage
 */

import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { resolveNodo, resolveOldid, loadLineaData } from '../src/loader.mjs';
import { lineaServers } from '../src/lineas.mjs';
import { startAll } from '../src/start-all.mjs';

const TEST_PORTS = { espana: 14111, wpHistoria: 14112 };
const ORIGINAL_PORTS = { espana: 4111, wpHistoria: 4112 };

lineaServers.espana.port = TEST_PORTS.espana;
lineaServers.wpHistoria.port = TEST_PORTS.wpHistoria;

async function connect(port) {
  const client = new Client({ name: 'linea-smoke-test', version: '1.0.0' });
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
  const { lineas } = await loadLineaData();
  const espanaData = lineas.espana;

  // Offline resolution checks before starting servers.
  const nodo1300 = resolveNodo(espanaData, 1300);
  assert.equal(nodo1300.nodo.id, 'P06');
  assert.equal(nodo1300.nodo.etiqueta, 'Transfiguración carismática');
  console.log('Loader OK: year 1300 → P06');

  const outsideWp = resolveOldid(espanaData.satellite, 1300);
  assert.equal(outsideWp.error, 'Year 1300 outside WP historia coverage');
  assert.deepEqual(outsideWp.coverage, { min: 2001, max: 2026 });
  console.log('Loader OK: year 1300 outside WP coverage returns explicit error');

  handles = await startAll();
  assert.equal(handles.length, 2);
  console.log('Started servers:', handles.map((h) => `${h.name}:${h.port}`).join(', '));

  const healthRes = await fetch(`http://localhost:${TEST_PORTS.espana}/mcp/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.server, 'linea-espana');
  assert.deepEqual(health.capabilities, { tools: 6, resources: 2, resourceTemplates: 2, prompts: 4 });
  console.log('Health check OK (tronco):', JSON.stringify(health));

  const espana = await connect(TEST_PORTS.espana);
  clients.push(espana);

  const nodoViaTool = toolResultJson(
    await espana.callTool({ name: 'get_nodo', arguments: { year: 1300 } })
  );
  assert.equal(nodoViaTool.nodo.id, 'P06');
  assert.equal(nodoViaTool.nodo.tesis_villacañas, 'Reyes como mediadores carismáticos del orden político');
  console.log('get_nodo OK: year 1300 → P06 via MCP');

  const nodoResource = await espana.readResource({ uri: 'linea://nodo/1300' });
  const nodoFromResource = JSON.parse(nodoResource.contents[0].text);
  assert.deepEqual(nodoFromResource, nodoViaTool);
  console.log('Template read OK: linea://nodo/1300');

  const wp = await connect(TEST_PORTS.wpHistoria);
  clients.push(wp);

  const wpHealth = await fetch(`http://localhost:${TEST_PORTS.wpHistoria}/mcp/health`);
  const wpHealthJson = await wpHealth.json();
  assert.deepEqual(wpHealthJson.capabilities, {
    tools: 7,
    resources: 3,
    resourceTemplates: 5,
    prompts: 7
  });
  console.log('Health check OK (satelite):', JSON.stringify(wpHealthJson));

  const oldid2010 = toolResultJson(await wp.callTool({ name: 'get_oldid', arguments: { year: 2010 } }));
  assert.equal(oldid2010.year, 2010);
  assert.ok(typeof oldid2010.oldid === 'number' && oldid2010.oldid > 0);
  assert.ok(oldid2010.timestamp);
  assert.ok(oldid2010.registro_id);
  console.log('get_oldid OK: year 2010 →', oldid2010.oldid, oldid2010.timestamp);

  const oldidViaResource = toolResultJson(
    await wp.callTool({ name: 'getResourceByUri', arguments: { uri: 'linea://oldid/2010' } })
  );
  assert.deepEqual(oldidViaResource, oldid2010);
  console.log('Template bridge OK: linea://oldid/2010');

  const outsideViaTool = toolResultJson(
    await wp.callTool({ name: 'get_oldid', arguments: { year: 1300 } })
  );
  assert.match(outsideViaTool.error, /outside WP historia coverage/);
  assert.deepEqual(outsideViaTool.coverage, { min: 2001, max: 2026 });

  const outsideViaUri = await wp.callTool({
    name: 'getResourceByUri',
    arguments: { uri: 'linea://oldid/1300' }
  });
  assert.equal(outsideViaUri.isError, true);
  const outsidePayload = JSON.parse(outsideViaUri.content[0].text);
  assert.match(outsidePayload.error, /outside WP historia coverage/);
  console.log('Outside coverage OK: year 1300 returns explicit empty error on satellite');

  const prompts = await espana.listPrompts();
  assert.equal(prompts.prompts.length, 4, `expected 4 prompts on tronco, got ${prompts.prompts.length}`);
  const promptNames = prompts.prompts.map((p) => p.name).sort();
  assert.deepEqual(promptNames, ['explore-server', 'report-nodo', 'report-parte', 'timeline-nodos']);
  console.log('Prompt catalog OK (tronco): 4 prompts');

  const wpPrompts = await wp.listPrompts();
  assert.equal(
    wpPrompts.prompts.length,
    7,
    `expected 7 prompts on satelite, got ${wpPrompts.prompts.length}`
  );
  const wpPromptNames = wpPrompts.prompts.map((p) => p.name).sort();
  assert.deepEqual(wpPromptNames, [
    'cache-status',
    'explore-server',
    'propose-viaje',
    'report-nodo',
    'report-oldid',
    'report-parte',
    'timeline-nodos'
  ]);
  console.log('Prompt catalog OK (satelite): 7 prompts');

  const bridgePrompts = toolResultJson(await espana.callTool({ name: 'getPrompts', arguments: {} }));
  assert.equal(bridgePrompts.server, 'linea-espana');
  assert.equal(bridgePrompts.prompts.length, 4);
  const bridgePromptNames = bridgePrompts.prompts.map((p) => p.name).sort();
  assert.deepEqual(bridgePromptNames, promptNames);
  console.log('Prompt bridge OK (tronco): getPrompts lists 4 prompts');

  const nativeNodoPrompt = await espana.getPrompt({ name: 'report-nodo', arguments: { year: '1300' } });
  const nativeNodoText = nativeNodoPrompt.messages[0].content.text;
  const bridgeNodoPrompt = toolResultJson(
    await espana.callTool({
      name: 'getPrompt',
      arguments: { name: 'report-nodo', arguments: { year: '1300' } }
    })
  );
  assert.equal(bridgeNodoPrompt.name, 'report-nodo');
  assert.equal(bridgeNodoPrompt.text, nativeNodoText);
  console.log('Prompt bridge OK (tronco): getPrompt report-nodo matches native');

  const unknownPrompt = await espana.callTool({ name: 'getPrompt', arguments: { name: 'no-existe' } });
  assert.equal(unknownPrompt.isError, true);
  assert.match(unknownPrompt.content[0].text, /Unknown prompt name/);
  console.log('Prompt bridge OK (tronco): unknown name returns error');

  const nativeOldidPrompt = await wp.getPrompt({ name: 'report-oldid', arguments: { year: '2010' } });
  const nativeOldidText = nativeOldidPrompt.messages[0].content.text;
  const bridgeOldidPrompt = toolResultJson(
    await wp.callTool({
      name: 'getPrompt',
      arguments: { name: 'report-oldid', arguments: { year: '2010' } }
    })
  );
  assert.equal(bridgeOldidPrompt.name, 'report-oldid');
  assert.equal(bridgeOldidPrompt.text, nativeOldidText);
  console.log('Prompt bridge OK (satelite): getPrompt report-oldid matches native');

  const cacheStats = toolResultJson(
    await wp.callTool({ name: 'getResourceByUri', arguments: { uri: 'linea://cache/stats' } })
  );
  assert.ok(cacheStats.registro_count > 0, 'cache stats should have registro_count > 0');
  assert.ok(cacheStats.curated_registros > 0, 'cache stats should have curated_registros > 0');
  assert.ok(cacheStats.cached_wikitexts > 0, 'cache stats should have cached_wikitexts > 0');
  assert.ok(Array.isArray(cacheStats.cached_oldids), 'cached_oldids should be an array');
  assert.ok(cacheStats.cached_oldids.length > 0, 'cached_oldids should not be empty');
  assert.ok(
    cacheStats.coverage_pct >= 0 && cacheStats.coverage_pct <= 100,
    'coverage_pct should be 0-100'
  );
  console.log(
    `Cache stats OK: ${cacheStats.cached_wikitexts} wikitexts, ${cacheStats.curated_registros} curated registros, ${cacheStats.coverage_pct}% coverage`
  );

  const cachedOldid = cacheStats.cached_oldids[0];
  const wikitextViaUri = toolResultJson(
    await wp.callTool({ name: 'getResourceByUri', arguments: { uri: `linea://wikitext/${cachedOldid}` } })
  );
  assert.equal(wikitextViaUri.oldid, cachedOldid);
  assert.equal(wikitextViaUri.cached, true);
  assert.ok(wikitextViaUri.wikitext_length > 0, 'wikitext should have content');
  assert.ok(typeof wikitextViaUri.wikitext === 'string', 'wikitext should be a string');
  console.log(`Wikitext read OK: oldid ${cachedOldid}, ${wikitextViaUri.wikitext_length} bytes`);

  const uncachedOldid = 999999999;
  const uncachedViaTool = await wp.callTool({
    name: 'getResourceByUri',
    arguments: { uri: `linea://wikitext/${uncachedOldid}` }
  });
  assert.equal(uncachedViaTool.isError, true, 'uncached oldid should return error');
  const uncachedPayload = JSON.parse(uncachedViaTool.content[0].text);
  assert.equal(uncachedPayload.error, 'not cached');
  assert.equal(uncachedPayload.cached, false);
  assert.ok(uncachedPayload.stats, 'uncached error should include stats');
  assert.ok(uncachedPayload.hint, 'uncached error should include hint');
  console.log('Uncached wikitext OK: structured error with stats and hint');

  const registroId = 'r0001';
  const registroViaUri = toolResultJson(
    await wp.callTool({ name: 'getResourceByUri', arguments: { uri: `linea://registro/${registroId}` } })
  );
  assert.equal(registroViaUri.registro_id, registroId);
  assert.ok(registroViaUri.oldid > 0, 'registro should have valid oldid');
  assert.ok(registroViaUri.registro_md, 'registro should have registro_md');
  console.log(`Registro read OK: ${registroId}, oldid ${registroViaUri.oldid}`);

  console.log('SMOKE TEST PASSED');
} catch (err) {
  failed = true;
  console.error('SMOKE TEST FAILED');
  console.error(err);
} finally {
  lineaServers.espana.port = ORIGINAL_PORTS.espana;
  lineaServers.wpHistoria.port = ORIGINAL_PORTS.wpHistoria;
  await Promise.allSettled(clients.map((c) => c.close()));
  await Promise.allSettled(handles.map((h) => h.close()));
}

process.exit(failed ? 1 : 0);
