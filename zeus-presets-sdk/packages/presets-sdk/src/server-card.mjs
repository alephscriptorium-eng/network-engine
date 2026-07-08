import { getMcpCapabilities } from './register-bridge-tools.mjs';

export const SERVER_CARD_URI = 'server://card';

/**
 * @param {{ name: string, version: string, port: number, server: import('@modelcontextprotocol/sdk/server/mcp.js').McpServer, host?: string }}
 */
export function buildServerCard({ name, version, port, server, host = 'localhost' }) {
  return {
    name,
    version,
    port,
    transport: 'streamable-http',
    endpoint: `http://${host}:${port}/mcp`,
    capabilities: getMcpCapabilities(server)
  };
}

/**
 * Registry entry for server://card. Wire with updateServerCard after MCP build.
 * @param {string} serverName
 */
export function createServerCardResource(serverName) {
  return {
    name: 'server-card',
    uri: SERVER_CARD_URI,
    title: `${serverName} server card`,
    mimeType: 'application/json',
    description: `Card describing the "${serverName}" MCP server itself: name, version, port and capabilities summary.`,
    read: () => {
      throw new Error('server://card is not wired yet; call updateServerCard after registerCommonMCP');
    }
  };
}

/**
 * Patches server://card in the registry to read capabilities dynamically from the built McpServer.
 * @param {Array<{ uri: string, read: () => unknown }>} registry
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ name: string, version: string, port: number, host?: string }} meta
 */
export function updateServerCard(registry, server, { name, version, port, host }) {
  const entry = registry.find((item) => item.uri === SERVER_CARD_URI);
  if (entry) {
    entry.read = () => buildServerCard({ name, version, port, server, host });
  }
}
