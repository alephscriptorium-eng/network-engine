/**
 * Starts a single body server: node src/server.mjs <sun|moon|earth>
 */

import { pathToFileURL } from 'node:url';
import { createBodyServer } from './body-server.mjs';
import { bodies, getBody } from './bodies.mjs';

export async function startOne(name) {
  return createBodyServer(getBody(name)).start();
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const name = process.argv[2];
  if (!name || !bodies[name]) {
    console.error(`Usage: node src/server.mjs <${Object.keys(bodies).join('|')}>`);
    process.exit(1);
  }
  const handle = await startOne(name);
  console.log(`[${handle.name}] MCP server listening at ${handle.url} (health: ${handle.url}/health)`);

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down ${handle.name}...`);
    await handle.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
