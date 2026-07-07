/**
 * In-process catalog service.
 * Replaces zeus/backend/mcpHandler.js: instead of proxying HTTP calls to a
 * remote preset service (with a mock-catalog fallback), it consumes the
 * @zeus/presets-sdk ServerRegistry directly. There is no mock fallback -
 * when no servers are reachable the catalog is simply empty.
 */

/**
 * Simple categorization based on item name patterns (ported from zeus
 * mcpHandler.categorizeByName, used by the editor UI category filter).
 */
export function categorizeByName(name = '') {
  if (name.includes('file') || name.includes('directory') || name.includes('read') || name.includes('write')) return 'file';
  if (name.includes('prompt')) return 'prompt';
  if (name.includes('resource')) return 'resource';
  if (name.includes('server') || name.includes('system') || name.includes('status')) return 'system';
  if (name.includes('web') || name.includes('console')) return 'web';
  if (name.includes('simulator') || name.includes('game')) return 'simulation';
  return 'general';
}

/**
 * Create a catalog service around a ServerRegistry, with a small TTL cache
 * so that page renders and API calls don't rebuild the catalog on every
 * request. `refreshCatalog()` forces a rebuild.
 */
export function createCatalogService({ registry, cacheTtlMs = 5000 }) {
  let cache = [];
  let cacheAt = 0;
  let inflight = null;

  async function refreshCatalog() {
    if (!inflight) {
      inflight = (async () => {
        try {
          const catalog = await registry.buildCatalog();
          cache = Array.isArray(catalog) ? catalog : [];
          cacheAt = Date.now();
        } catch (error) {
          console.error('Catalog build failed:', error.message);
          cache = [];
          cacheAt = Date.now();
        } finally {
          inflight = null;
        }
        return cache;
      })();
    }
    return inflight;
  }

  async function getCatalog() {
    if (cacheAt && Date.now() - cacheAt < cacheTtlMs) {
      return cache;
    }
    return refreshCatalog();
  }

  async function getServerEntry(serverId) {
    const catalog = await getCatalog();
    return catalog.find(server => server.serverName === serverId) || null;
  }

  /**
   * Map the catalog to the server list shape the browser JS expects
   * (same mapping zeus mcpHandler.getAllServers performed).
   */
  async function getAllServers() {
    const catalog = await getCatalog();
    return catalog.map(server => ({
      id: server.serverName,
      name: server.serverInfo?.name || server.serverName,
      description: `MCP Server: ${server.serverInfo?.name || server.serverName}`,
      status: server.isConnected ? 'connected' : 'disconnected',
      type: 'mcp',
      toolsCount: server.tools?.length || 0,
      resourcesCount: server.resources?.length || 0,
      resourceTemplatesCount: server.resourceTemplates?.length || 0,
      promptsCount: server.prompts?.length || 0,
      url: server.serverInfo?.url
    }));
  }

  /**
   * Returns null when the server is unknown (API maps that to 404).
   */
  async function getServerTools(serverId) {
    const entry = await getServerEntry(serverId);
    if (!entry) return null;
    return (entry.tools || []).map(tool => ({
      name: tool.name,
      description: tool.description,
      category: categorizeByName(tool.name),
      parameters: tool.parameters,
      type: tool.type || 'tool'
    }));
  }

  async function getServerResources(serverId) {
    const entry = await getServerEntry(serverId);
    if (!entry) return null;
    return (entry.resources || []).map(resource => ({
      name: resource.name,
      type: resource.mimeType || 'unknown',
      description: resource.description,
      uri: resource.uri,
      mimeType: resource.mimeType
    }));
  }

  async function getServerPrompts(serverId) {
    const entry = await getServerEntry(serverId);
    if (!entry) return null;
    return (entry.prompts || []).map(prompt => ({
      name: prompt.name,
      category: categorizeByName(prompt.name),
      description: prompt.description,
      arguments: prompt.arguments || [],
      type: prompt.type || 'prompt'
    }));
  }

  async function getServerResourceTemplates(serverId) {
    const entry = await getServerEntry(serverId);
    if (!entry) return null;
    return (entry.resourceTemplates || []).map(template => ({
      name: template.name,
      description: template.description,
      uriTemplate: template.uriTemplate,
      mimeType: template.mimeType,
      type: template.type || 'resourceTemplate'
    }));
  }

  return {
    refreshCatalog,
    getCatalog,
    getServerEntry,
    getAllServers,
    getServerTools,
    getServerResources,
    getServerResourceTemplates,
    getServerPrompts
  };
}
