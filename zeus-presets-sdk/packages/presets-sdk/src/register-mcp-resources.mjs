/**
 * Registers fixed MCP resources and resource templates on an McpServer.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

function resourceContents(uri, mimeType, payload) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType,
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{
 *   registry: Array<{ name: string, uri: string, title: string, mimeType: string, description: string, read: () => unknown }>,
 *   templateRegistry: Array<{ name: string, uriTemplate: string, title: string, mimeType: string, description: string, read: (variables: Record<string, string>) => unknown | Promise<unknown> }>
 * }} options
 */
export function registerCommonMCP(server, { registry, templateRegistry }) {
  for (const entry of registry) {
    server.registerResource(
      entry.name,
      entry.uri,
      { title: entry.title, description: entry.description, mimeType: entry.mimeType },
      async (uri) => resourceContents(uri, entry.mimeType, entry.read())
    );
  }

  for (const entry of templateRegistry) {
    server.registerResource(
      entry.name,
      new ResourceTemplate(entry.uriTemplate, { list: undefined }),
      { title: entry.title, description: entry.description, mimeType: entry.mimeType },
      async (uri, variables) => {
        const payload = await entry.read(variables);
        if (payload?.error) {
          throw new Error(JSON.stringify(payload));
        }
        return resourceContents(uri, entry.mimeType, payload);
      }
    );
  }
}
