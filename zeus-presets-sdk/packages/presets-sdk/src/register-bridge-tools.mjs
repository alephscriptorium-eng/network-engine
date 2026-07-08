/**
 * Shared MCP registration for zeus preset servers: native resources/templates
 * plus bridge tools for clients without native resource/prompt APIs.
 */

import { z } from 'zod';
import { registerCommonMCP as registerNativeResources } from './register-mcp-resources.mjs';

export function jsonContent(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function toPublicDescriptor({ name, uri, mimeType, description }) {
  return { name, uri, mimeType, description };
}

function toPublicTemplateDescriptor({ name, uriTemplate, mimeType, description }) {
  return { name, uriTemplate, mimeType, description };
}

function toPublicPromptDescriptor({ name, title, description, argsSchema }) {
  return { name, title, description, arguments: Object.keys(argsSchema || {}) };
}

export function renderPromptText(entry, args = {}) {
  return extractPromptText(entry.render(args || {}));
}

export function promptMessages(text) {
  return {
    messages: [
      {
        role: 'user',
        content: { type: 'text', text }
      }
    ]
  };
}

function extractPromptText(result) {
  if (typeof result === 'string') return result;
  return result?.messages?.[0]?.content?.text ?? String(result);
}

function toPromptMessages(result) {
  if (typeof result === 'string') return promptMessages(result);
  if (result?.messages) return result;
  return promptMessages(String(result));
}

function registerNativePrompts(server, promptRegistry) {
  for (const prompt of promptRegistry) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema: prompt.argsSchema
      },
      (args) => toPromptMessages(prompt.render(args || {}))
    );
  }
}

/**
 * Capability counts from the built McpServer (same registration stores as tools/list, etc.).
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function getMcpCapabilities(server) {
  return {
    tools: Object.values(server._registeredTools).filter((tool) => tool.enabled).length,
    resources: Object.values(server._registeredResources).filter((resource) => resource.enabled).length,
    resourceTemplates: Object.keys(server._registeredResourceTemplates).length,
    prompts: Object.values(server._registeredPrompts).filter((prompt) => prompt.enabled).length
  };
}

function matchTemplateUri(uri, templates) {
  for (const entry of templates) {
    const varNames = [];
    const parts = entry.uriTemplate.split(/\{([^}]+)\}/);
    let pattern = '';
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        pattern += parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      } else {
        varNames.push(parts[i]);
        pattern += '([^/]+)';
      }
    }
    const match = uri.match(new RegExp(`^${pattern}$`));
    if (!match) continue;
    const variables = Object.fromEntries(varNames.map((name, i) => [name, match[i + 1]]));
    return { entry, variables };
  }
  return null;
}

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{
 *   serverName: string,
 *   registry: Array<{ name: string, uri: string, mimeType: string, description: string, read: () => unknown }>,
 *   templateRegistry: Array<{ name: string, uriTemplate: string, mimeType: string, description: string, read: (variables: Record<string, string>) => unknown | Promise<unknown> }>,
 *   promptRegistry: Array<{ name: string, title: string, description: string, argsSchema?: Record<string, unknown>, render: (args?: Record<string, string>) => unknown }>
 * }} options
 */
export function registerCommonMCP(server, { serverName, registry, templateRegistry, promptRegistry }) {
  registerNativeResources(server, { registry, templateRegistry });
  registerNativePrompts(server, promptRegistry);

  server.registerTool(
    'getResourcesUris',
    {
      title: `List ${serverName} resource URIs`,
      description: `Returns the URIs of MCP resources registered by the ${serverName} server. Use getResourceByUri to read the JSON payload.`,
      inputSchema: {}
    },
    async () =>
      jsonContent({
        server: serverName,
        uris: registry.map((r) => r.uri),
        resources: registry.map(toPublicDescriptor)
      })
  );

  server.registerTool(
    'getResourceTemplates',
    {
      title: `List ${serverName} resource templates`,
      description: `Returns the URI templates of MCP resource templates registered by the ${serverName} server. Substitute variables and use getResourceByUri to read the JSON payload.`,
      inputSchema: {}
    },
    async () =>
      jsonContent({
        server: serverName,
        uriTemplates: templateRegistry.map((t) => t.uriTemplate),
        resourceTemplates: templateRegistry.map(toPublicTemplateDescriptor)
      })
  );

  server.registerTool(
    'getResourceByUri',
    {
      title: `Read ${serverName} resource by URI`,
      description: `Reads a registered MCP resource or template-resolved URI and returns its JSON payload.`,
      inputSchema: {
        uri: z.string().describe('Resource URI or resolved template URI.')
      }
    },
    async ({ uri }) => {
      const fixed = registry.find((r) => r.uri === uri);
      if (fixed) {
        return jsonContent(fixed.read());
      }

      const matched = matchTemplateUri(uri, templateRegistry);
      if (matched) {
        const payload = await matched.entry.read(matched.variables);
        if (payload?.error) {
          return {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
          };
        }
        return jsonContent(payload);
      }

      const availableUris = registry.map((r) => r.uri);
      const availableTemplates = templateRegistry.map((t) => t.uriTemplate);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Unknown resource URI "${uri}". Available fixed: ${availableUris.join(', ')}. Templates: ${availableTemplates.join(', ')}`
          }
        ]
      };
    }
  );

  server.registerTool(
    'getPrompts',
    {
      title: `List ${serverName} prompts`,
      description: `Returns the prompts registered by the ${serverName} server (name, title, description, argument keys). Use getPrompt to render prompt text.`,
      inputSchema: {}
    },
    async () =>
      jsonContent({
        server: serverName,
        prompts: promptRegistry.map(toPublicPromptDescriptor)
      })
  );

  server.registerTool(
    'getPrompt',
    {
      title: `Read ${serverName} prompt text`,
      description: `Renders a registered MCP prompt by name and optional arguments. Fallback for clients without native getPrompt.`,
      inputSchema: {
        name: z.string().describe('Prompt name (MCP identifier).'),
        arguments: z
          .record(z.string())
          .optional()
          .describe('Prompt argument values, e.g. { "year": "1300" }.')
      }
    },
    async ({ name, arguments: args = {} }) => {
      const entry = promptRegistry.find((p) => p.name === name);
      if (!entry) {
        const availableNames = promptRegistry.map((p) => p.name);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown prompt name "${name}". Available: ${availableNames.join(', ')}`
            }
          ]
        };
      }
      return jsonContent({
        name,
        text: renderPromptText(entry, args)
      });
    }
  );
}
