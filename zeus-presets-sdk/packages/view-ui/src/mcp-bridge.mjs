/**
 * Optional MCP enrichment for view-ui (cache stats live).
 */

import {
  ServerRegistry,
  syncDiscoveredServers,
  resolveDiscoverySources
} from '@zeus/presets-sdk';

/**
 * @param {object} options
 * @param {string} options.dataDir
 * @param {object} options.discovery
 */
export function createMcpBridge(options) {
  const registry = new ServerRegistry();
  let lastSync = null;

  async function refresh() {
    const sources = resolveDiscoverySources({
      dataDir: options.dataDir,
      localDiscovery: options.discovery
    });
    const result = await syncDiscoveredServers(registry, sources, {
      pruneStale: true,
      registerMode: 'strict'
    });
    lastSync = { at: Date.now(), ...result };
    return result;
  }

  /**
   * @param {string} serverName
   * @param {string} uri
   */
  async function readResource(serverName, uri) {
    await refresh();
    const extractor = registry.extractors.get(serverName);
    if (!extractor) {
      return { error: `server not connected: ${serverName}` };
    }
    try {
      const result = await extractor.readResource(uri);
      const text = result?.contents?.[0]?.text;
      if (!text) return { error: 'empty resource response' };
      return { data: JSON.parse(text), source: 'mcp' };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * @param {object} lineaServers - { tronco, satelite }
   */
  async function fetchCacheStats(lineaServers) {
    if (!lineaServers?.satelite) {
      return { error: 'no satellite server configured' };
    }
    return readResource(lineaServers.satelite, 'linea://cache/stats');
  }

  async function close() {
    await registry.close();
  }

  return {
    registry,
    refresh,
    readResource,
    fetchCacheStats,
    close,
    getLastSync: () => lastSync
  };
}
