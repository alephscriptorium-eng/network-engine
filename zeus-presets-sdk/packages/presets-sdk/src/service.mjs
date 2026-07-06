import express from 'express';
import cors from 'cors';

import { ServerRegistry } from './registry.mjs';
import { PresetStore } from './preset-store.mjs';
import { discoverServers } from './discovery.mjs';
import { createPresetRoutes } from './routes.mjs';

/**
 * Boot a standalone preset service: express app with cors+json, /health,
 * the preset routes under `prefix`, and background server discovery
 * from `sources` (options for discoverServers).
 *
 * Discovery/registration runs in the background so listen() is not blocked,
 * mirroring the lazy ensureServersLoaded pattern of the original service.
 *
 * Returns { app, server, registry, store, port }. Stop with server.close()
 * (plus registry.close() to drop MCP connections).
 */
export async function createPresetService({
  port = 4001,
  dataDir,
  sources = {},
  prefix = '/api/mcp'
} = {}) {
  const registry = new ServerRegistry();
  const store = new PresetStore({ dataDir });

  const app = express();
  app.use(cors());
  app.use(express.json());

  let ready = false;

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      mode: 'preset-service',
      ready,
      timestamp: Date.now()
    });
  });

  app.use(createPresetRoutes({ registry, store, prefix }));

  // Discover and register servers in the background without blocking listen
  const discovery = (async () => {
    try {
      const found = await discoverServers(sources);
      console.log(`Discovery: ${found.length} server(s) found`);

      const registrations = found.map(async ({ name, url, transport }) => {
        try {
          return await registry.registerServer(name, url, transport || 'http');
        } catch (err) {
          console.error(`Error registering server ${name}:`, err.message);
          return null;
        }
      });

      const results = await Promise.all(registrations);
      const ok = results.filter(Boolean).length;
      console.log(`Servers registered: ${ok}/${found.length}`);
    } catch (error) {
      console.error('Error during server discovery:', error.message);
    } finally {
      ready = true;
    }
  })();
  discovery.catch(() => {});

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, () => resolve(s));
    s.on('error', reject);
  });

  const actualPort = server.address().port;
  console.log(`Preset service listening on port ${actualPort}`);

  return { app, server, registry, store, port: actualPort };
}
