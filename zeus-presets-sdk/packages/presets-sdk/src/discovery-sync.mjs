/**
 * Orchestrates MCP server discovery + registry sync.
 */

import { discoverServers } from './discovery.mjs';

/**
 * Probe, optionally prune stale extractors, register found servers, refresh catalog.
 *
 * @param {import('./registry.mjs').ServerRegistry} registry
 * @param {import('./discovery.mjs').DiscoverOptions | { urls?: string[], timeoutMs?: number }} sources
 * @param {{
 *   catalog?: ReturnType<import('./catalog-service.mjs').createCatalogService> | null,
 *   pruneStale?: boolean,
 *   registerMode?: 'strict' | 'safe'
 * }} [options]
 */
export async function syncDiscoveredServers(registry, sources, options = {}) {
  const {
    catalog = null,
    pruneStale = false,
    registerMode = 'strict'
  } = options;

  const found = await discoverServers(sources);
  const foundByName = new Map(found.map((s) => [s.name, s]));
  let pruned = [];

  if (pruneStale) {
    pruned = await registry.disconnectMissing([...foundByName.keys()]);
  }

  const registered = [];
  const errors = [];

  for (const server of found) {
    try {
      const result =
        registerMode === 'safe'
          ? await registry.registerServerSafe(server.name, server.url, server.transport || 'http')
          : await registry.registerServer(server.name, server.url, server.transport || 'http');
      registered.push(result);
      if (result.connected === false) {
        errors.push({ name: server.name, error: result.error });
      }
    } catch (error) {
      errors.push({ name: server.name, error: error.message });
    }
  }

  if (catalog) {
    await catalog.refreshCatalog();
  }

  return {
    found,
    registered,
    pruned,
    errors,
    at: Date.now()
  };
}
