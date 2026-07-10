/**
 * Starts the two linea MCP servers (linea-espana, linea-wp-historia) in one
 * process. Usable as a CLI (npm start) or programmatically via startAll().
 */

import { pathToFileURL } from 'node:url';
import { resolveZeusMcpPorts } from '@zeus/presets-sdk';
import { createServer } from './linea-server.mjs';
import { loadLineaData } from './loader.mjs';
import { lineaServers } from './lineas.mjs';

function lineaServersWithEnvPorts() {
  const mcp = resolveZeusMcpPorts();
  return {
    espana: { ...lineaServers.espana, port: mcp.lineas.espana },
    wpHistoria: { ...lineaServers.wpHistoria, port: mcp.lineas.wpHistoria }
  };
}

/**
 * Starts both linea servers. Resolves to an array of
 * { name, port, url, close() } handles, in order: espana, wp-historia.
 * If any server fails to start, already-started ones are closed first.
 * @param {string} [basePath]
 */
export async function startAll(basePath) {
  const servers = lineaServersWithEnvPorts();
  const { lineas } = await loadLineaData(basePath);
  const espanaData = lineas[servers.espana.lineaId];
  if (!espanaData) {
    throw new Error(`Line data not found for "${servers.espana.lineaId}"`);
  }

  const configs = [servers.espana, servers.wpHistoria];
  const handles = [];

  for (const config of configs) {
    try {
      handles.push(await createServer(config, espanaData).start());
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
    console.log(`[${h.name}] MCP server listening at ${h.url} (health: ${h.url.replace(/\/mcp$/, '/mcp/health')})`);
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
