/**
 * Starts the three solar-system MCP servers (sun, moon, earth) in one
 * process. Usable as a CLI (npm start) or programmatically via startAll().
 */

import { pathToFileURL } from 'node:url';
import { createBodyServer } from './body-server.mjs';
import { bodies } from './bodies.mjs';

/**
 * Starts all three servers. Resolves to an array of
 * { name, port, url, close() } handles, in order: sun, moon, earth.
 * If any server fails to start, already-started ones are closed first.
 */
export async function startAll() {
  const handles = [];
  for (const body of Object.values(bodies)) {
    try {
      handles.push(await createBodyServer(body).start());
    } catch (err) {
      await Promise.allSettled(handles.map((h) => h.close()));
      throw err;
    }
  }
  return handles;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const handles = await startAll();
  for (const h of handles) {
    console.log(`[${h.name}] MCP server listening at ${h.url} (health: ${h.url}/health)`);
  }

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down ${handles.length} servers...`);
    await Promise.allSettled(handles.map((h) => h.close()));
    console.log('All servers stopped.');
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
