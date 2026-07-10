/**
 * Smoke test for @zeus/linea-firehose MCP server (disk read-only).
 */

import assert from 'node:assert/strict';
import { connectMcp, toolResultJson } from '@zeus/test-utils';
import { browseCorpus, getFirehoseStats } from '../src/browse.mjs';
import { startFirehoseMcp } from '../src/start.mjs';

const TEST_PORT = 13008;

async function connect(port) {
  return connectMcp(port);
}

let handle = null;
const clients = [];

try {
  const stats = getFirehoseStats();
  assert(stats.totals.candidate > 0, 'expected candidate files on disk');
  console.log(`Volume OK: ${stats.totals.candidate} candidate posts`);

  const browse = await browseCorpus('candidate', '', { limit: 5 });
  assert(browse.entries.length > 0, 'candidate root browse empty');
  console.log('browseCorpus OK');

  handle = await startFirehoseMcp({ port: TEST_PORT });
  console.log(`Server started at ${handle.url}`);

  const healthRes = await fetch(`http://localhost:${TEST_PORT}/mcp/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.server, 'firehose-mcp-server');
  assert(health.capabilities?.tools > 0, 'expected tools in capabilities');
  console.log('GET /mcp/health OK');

  const client = await connect(TEST_PORT);
  clients.push(client);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name);
  assert(toolNames.includes('firehose_browse'), 'missing firehose_browse');
  assert(toolNames.includes('firehose_list_posts'), 'missing firehose_list_posts');
  console.log('tools/list OK');

  const browseResult = toolResultJson(
    await client.callTool({ name: 'firehose_browse', arguments: { corpus: 'candidate', limit: 5 } })
  );
  assert(browseResult.entries?.length > 0, 'firehose_browse returned no entries');
  console.log('firehose_browse OK');

  const resources = await client.listResources();
  const uris = resources.resources.map((r) => r.uri);
  assert(uris.includes('firehose://stats'), 'missing firehose://stats resource');
  console.log('resources/list OK');

  console.log('\nfirehose MCP smoke OK');
} catch (err) {
  console.error('\nfirehose MCP smoke FAILED:', err.message || err);
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map((c) => c.close()));
  if (handle) await handle.close();
}
