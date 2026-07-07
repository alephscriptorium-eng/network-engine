import { MCPToolsExtractor } from './extractor.mjs';
import {
  formatTools,
  formatResources,
  formatResourceTemplates,
  formatPrompts
} from './validation.mjs';

export class ServerRegistry {
  constructor() {
    this.extractors = new Map();
    this.knownServers = new Map();
    this.failedServers = new Map();
  }

  async registerServer(serverName, serverConfig, transportType = 'http') {
    const url = typeof serverConfig === 'string' ? serverConfig : serverConfig?.url;
    if (url) this.knownServers.set(serverName, { url, transport: transportType });

    try {
      const extractor = new MCPToolsExtractor();
      await extractor.connectToServer(serverConfig, transportType, serverName);
      await extractor.extractCompleteMetadata();
      this.extractors.set(serverName, extractor);
      this.failedServers.delete(serverName);
      return { serverName, connected: true };
    } catch (error) {
      this.failedServers.set(serverName, {
        serverConfig,
        transportType,
        error: error.message
      });
      throw error;
    }
  }

  async registerServerSafe(serverName, serverConfig, transportType = 'http') {
    try {
      return await this.registerServer(serverName, serverConfig, transportType);
    } catch (error) {
      return { serverName, connected: false, error: error.message };
    }
  }

  get serverNames() {
    const names = new Set([
      ...this.extractors.keys(),
      ...this.knownServers.keys(),
      ...this.failedServers.keys()
    ]);
    return [...names];
  }

  async buildCatalog() {
    const catalog = [];

    for (const [serverName, extractor] of this.extractors) {
      try {
        const metadata = await extractor.extractCompleteMetadata();
        catalog.push({
          serverName,
          serverInfo: metadata.serverInfo || { name: serverName },
          isConnected: extractor.isConnected,
          extractedAt: metadata.extractedAt,
          tools: formatTools(metadata.tools || []),
          resources: formatResources(metadata.resources || []),
          resourceTemplates: formatResourceTemplates(metadata.resourceTemplates || []),
          prompts: formatPrompts(metadata.prompts || [])
        });
      } catch (error) {
        catalog.push({
          serverName,
          serverInfo: { name: serverName, error: true },
          isConnected: false,
          error: error.message,
          tools: [],
          resources: [],
          resourceTemplates: [],
          prompts: []
        });
      }
    }

    for (const [name, conf] of this.knownServers) {
      if (!this.extractors.has(name)) {
        catalog.push({
          serverName: name,
          serverInfo: { name, url: conf.url },
          isConnected: false,
          error: this.failedServers.get(name)?.error || 'not connected',
          tools: [],
          resources: [],
          resourceTemplates: [],
          prompts: []
        });
      }
    }

    return catalog;
  }

  async close() {
    for (const extractor of this.extractors.values()) {
      await extractor.disconnect();
    }
    this.extractors.clear();
  }
}
