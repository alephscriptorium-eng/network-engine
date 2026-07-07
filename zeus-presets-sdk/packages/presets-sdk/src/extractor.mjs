import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class MCPToolsExtractor {
  constructor() {
    this.client = null;
    this.transport = null;
    this.serverInfo = null;
    this.isConnected = false;
    this.originalServerName = null;
  }

  async connectToServer(serverConfig, transportType = 'http', originalServerName = null) {
    if (transportType === 'stdio') {
      if (typeof serverConfig === 'string') {
        throw new Error('stdio transport requires command and args configuration');
      }
      this.transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {}
      });
    } else if (transportType === 'http' || transportType === 'sse') {
      const url = typeof serverConfig === 'string' ? serverConfig : serverConfig.url;
      const baseUrl = new URL(`${url}/mcp`);
      this.transport = new StreamableHTTPClientTransport(baseUrl);
    } else {
      throw new Error(`Unsupported transport type: ${transportType}`);
    }

    this.client = new Client(
      { name: 'mcp-tools-extractor', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    const connectPromise = this.client.connect(this.transport);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    this.isConnected = true;
    this.originalServerName = originalServerName;
    this.serverInfo = {
      name: originalServerName || 'mcp-server',
      version: 'unknown',
      url: typeof serverConfig === 'string' ? serverConfig : serverConfig.url
    };
    return true;
  }

  async listTools() {
    if (!this.isConnected || !this.client) throw new Error('Client not connected');
    const response = await this.client.listTools();
    return response.tools || [];
  }

  async listResources() {
    if (!this.isConnected || !this.client) throw new Error('Client not connected');
    const response = await this.client.listResources();
    return response.resources || [];
  }

  async listResourceTemplates() {
    if (!this.isConnected || !this.client) throw new Error('Client not connected');
    try {
      if (typeof this.client.listResourceTemplates !== 'function') return [];
      const response = await this.client.listResourceTemplates();
      return response.resourceTemplates || [];
    } catch {
      return [];
    }
  }

  async listPrompts() {
    if (!this.isConnected || !this.client) throw new Error('Client not connected');
    const response = await this.client.listPrompts();
    return response.prompts || [];
  }

  async callTool(name, arguments_ = {}) {
    if (!this.isConnected || !this.client) throw new Error('Client not connected');
    const response = await this.client.callTool({ name, arguments: arguments_ });
    return response.content || [];
  }

  async readResource(uri) {
    if (!this.isConnected || !this.client) throw new Error('Client not connected');
    if (!uri) throw new Error('uri is required');
    if (typeof this.client.readResource !== 'function') {
      throw new Error('Client does not support readResource');
    }
    return this.client.readResource({ uri });
  }

  async extractCompleteMetadata() {
    if (!this.isConnected) throw new Error('Client not connected');
    const [tools, resources, resourceTemplates, prompts] = await Promise.all([
      this.listTools(),
      this.listResources(),
      this.listResourceTemplates(),
      this.listPrompts()
    ]);
    return {
      serverInfo: this.serverInfo,
      tools,
      resources,
      resourceTemplates,
      prompts,
      extractedAt: new Date().toISOString()
    };
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
      } catch {
        /* best effort */
      }
      this.isConnected = false;
    }
  }

  getServerName() {
    if (this.originalServerName) return this.originalServerName;
    if (this.serverInfo?.url) {
      try {
        const url = new URL(this.serverInfo.url);
        return url.hostname.replace(/\./g, '-');
      } catch {
        return 'mcp-server';
      }
    }
    return this.serverInfo?.name || 'mcp-server';
  }
}
