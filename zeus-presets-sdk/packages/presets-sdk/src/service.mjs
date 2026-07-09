import express from 'express';
import cors from 'cors';

import { ServerRegistry } from './registry.mjs';
import { PresetStore } from './preset-store.mjs';
import { createCatalogService } from './catalog-service.mjs';
import { syncDiscoveredServers } from './discovery-sync.mjs';
import { createPresetRoutes } from './routes.mjs';

/**
 * Boot a standalone preset service: express app with cors+json, /health,
 * the preset routes under `prefix`, and background server discovery
 * from `sources` (options for discoverServers).
 *
 * Discovery/registration runs in the background so listen() is not blocked,
 * mirroring the lazy ensureServersLoaded pattern of the original service.
 *
 * Returns { app, server, registry, store, catalog, port }. Stop with server.close()
 * (plus registry.close() to drop MCP connections).
 */
export async function createPresetService({
  port = 4001,
  dataDir,
  sources = {},
  prefix = '/api/mcp',
  pruneStale = false
} = {}) {
  const registry = new ServerRegistry();
  const store = new PresetStore({ dataDir });
  const catalog = createCatalogService({ registry });

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

  const discovery = (async () => {
    try {
      const result = await syncDiscoveredServers(registry, sources, {
        catalog,
        pruneStale,
        registerMode: 'safe'
      });
      console.log(
        `Discovery: ${result.found.length} server(s) found, ${result.registered.filter((r) => r.connected !== false).length} registered`
      );
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

  return { app, server, registry, store, catalog, port: actualPort };
}
