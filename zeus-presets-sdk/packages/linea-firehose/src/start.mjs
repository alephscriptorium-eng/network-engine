/**
 * CLI entry: npm start — firehose MCP server on :3008 (or FIREHOSE_MCP_PORT).
 */

import { pathToFileURL } from 'node:url';
import { getServerConfig } from './config.mjs';
import { createServer } from './firehose-server.mjs';

export async function startFirehoseMcp(configOverride = {}) {
  const config = { ...getServerConfig(), ...configOverride };
  const factory = createServer(config);
  return factory.start();
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const handle = await startFirehoseMcp();
  console.log(
    `[${handle.name}] MCP server listening at ${handle.url} (health: ${handle.url.replace(/\/mcp$/, '/mcp/health')})`
  );

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down...`);
    await handle.close();
    console.log('Server stopped.');
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
