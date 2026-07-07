/**
 * Shared factory for a celestial-body MCP server over Streamable HTTP.
 *
 * Transport contract (mirrors the edge-mcp contract used by the catalog
 * extractor): POST {base}/mcp for MCP traffic, GET {base}/mcp/health for
 * discovery. Stateless mode: a fresh McpServer + transport is created for
 * every POST request.
 */

import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SERVER_VERSION } from './bodies.mjs';

const MS_PER_DAY = 86400000;
const TWO_PI = 2 * Math.PI;

const CAPABILITIES = { tools: 7, resources: 2, resourceTemplates: 2, prompts: 4 };

function buildBodyInfo(body) {
  return {
    name: body.name,
    type: body.type,
    orbitRadiusAU: body.orbitRadiusAU,
    orbitalPeriodDays: body.orbitalPeriodDays ?? null,
    rotationPeriodDays: body.rotationPeriodDays,
    radiusKm: body.radiusKm,
    massKg: body.massKg,
    ...(body.parent ? { orbits: body.parent.name } : {}),
    description: body.description
  };
}

function buildServerCard(body) {
  return {
    name: body.name,
    version: SERVER_VERSION,
    port: body.port,
    transport: 'streamable-http',
    endpoint: `http://localhost:${body.port}/mcp`,
    capabilities: CAPABILITIES
  };
}

function getResourceRegistry(body) {
  return [
    {
      name: 'body-info',
      uri: 'body://info',
      title: `${body.name} info`,
      mimeType: 'application/json',
      description: `Static fact card for the ${body.type} "${body.name}": physical constants and description.`,
      read: () => buildBodyInfo(body)
    },
    {
      name: 'server-card',
      uri: 'server://card',
      title: `${body.name} server card`,
      mimeType: 'application/json',
      description: `Card describing the "${body.name}" MCP server itself: name, version, port and capabilities summary.`,
      read: () => buildServerCard(body)
    }
  ];
}

function getTemplateRegistry(body) {
  return [
    {
      name: 'body-position',
      uriTemplate: 'body://position/{timestamp}',
      title: `${body.name} position at timestamp`,
      mimeType: 'application/json',
      description: `Heliocentric position of ${body.name} at a specific epoch-ms. Each resolved URI is a stable, cacheable document.`,
      read: (variables) => {
        const parsed = parseTimestamp(variables.timestamp);
        if (parsed.error) return parsed;
        return computePosition(body, parsed.timestamp);
      }
    },
    {
      name: 'body-rotation',
      uriTemplate: 'body://rotation/{timestamp}',
      title: `${body.name} rotation at timestamp`,
      mimeType: 'application/json',
      description: `Rotation angle of ${body.name} at a specific epoch-ms. Each resolved URI is a stable, cacheable document.`,
      read: (variables) => {
        const parsed = parseTimestamp(variables.timestamp);
        if (parsed.error) return parsed;
        return computeRotation(body, parsed.timestamp);
      }
    }
  ];
}

function getPromptRegistry(body) {
  const constellationPorts = {
    sun: 4101,
    moon: 4102,
    earth: 4103
  };
  
  return [
    {
      name: 'explore-server',
      title: `Explore ${body.name} server`,
      description: `Menu of available capabilities for the ${body.name} MCP server.`,
      argsSchema: {},
      render: () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                `Explore what the ${body.type} "${body.name}" MCP server offers.`,
                '',
                'Steps:',
                '1. Read the resource body://info to see the physical constants and description.',
                '   Fallback: call getResourceByUri({ uri: "body://info" }).',
                '2. Read the resource server://card to see the server metadata, version, and capabilities.',
                '   Fallback: call getResourceByUri({ uri: "server://card" }).',
                '3. List the available resource templates (body://position/{timestamp} and body://rotation/{timestamp}).',
                '   Fallback: call getResourceTemplates() to enumerate them.',
                '4. List the deterministic tools: get_position(timestamp?) and get_rotation(timestamp?).',
                '5. Summarize what kinds of queries the user can make to this server.'
              ].join('\n')
            }
          }
        ]
      })
    },
    {
      name: 'report-status',
      title: `${body.name} status report`,
      description: `Instructions for an agent to produce a status report for ${body.name} at a given timestamp.`,
      argsSchema: {
        timestamp: z
          .string()
          .optional()
          .describe('Epoch milliseconds as a string. If omitted, the agent should use the current time.')
      },
      render: ({ timestamp }) => {
        const at = timestamp ? `timestamp ${timestamp} (epoch ms)` : 'the current time (Date.now())';
        const tsArg = timestamp ? `{ "timestamp": ${timestamp} }` : 'no arguments (defaults to now)';
        const resolvedPositionUri = timestamp ? `body://position/${timestamp}` : 'body://position/{timestamp} with the chosen epoch ms';
        const resolvedRotationUri = timestamp ? `body://rotation/${timestamp}` : 'body://rotation/{timestamp} with the chosen epoch ms';
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: [
                  `Produce a status report for the ${body.type} "${body.name}" at ${at}.`,
                  '',
                  'Steps:',
                  '1. Read the resource body://info to get the physical constants and description of the body.',
                  '   If the client cannot attach MCP resources directly, call getResourceByUri({ uri: "body://info" }).',
                  `2. Obtain the heliocentric position at ${at}:`,
                  `   - Preferred: read the resource template ${resolvedPositionUri}.`,
                  `   - Alternative: call get_position with ${tsArg}.`,
                  `   - Bridge fallback: getResourceByUri({ uri: "${timestamp ? `body://position/${timestamp}` : 'body://position/<epoch-ms>'}" }).`,
                  `3. Obtain the rotation state at ${at}:`,
                  `   - Preferred: read the resource template ${resolvedRotationUri}.`,
                  `   - Alternative: call get_rotation with ${tsArg}.`,
                  `   - Bridge fallback: getResourceByUri({ uri: "${timestamp ? `body://rotation/${timestamp}` : 'body://rotation/<epoch-ms>'}" }).`,
                  '4. Write a concise status report combining the fact card, the position (angle and x/y in AU) and the rotation state at that instant.'
                ].join('\n')
              }
            }
          ]
        };
      }
    },
    {
      name: 'position-report',
      title: `${body.name} position report`,
      description: `Direct trigger to read ${body.name} position at a given timestamp and explain it.`,
      argsSchema: {
        timestamp: z
          .string()
          .optional()
          .describe('Epoch milliseconds as a string. If omitted, the agent should use the current time.')
      },
      render: ({ timestamp }) => {
        const at = timestamp ? `timestamp ${timestamp} (epoch ms)` : 'the current time (Date.now())';
        const tsArg = timestamp ? `{ "timestamp": ${timestamp} }` : 'no arguments (defaults to now)';
        const resolvedPositionUri = timestamp ? `body://position/${timestamp}` : 'body://position/{timestamp} with the chosen epoch ms';
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: [
                  `Report the heliocentric position of ${body.name} at ${at}.`,
                  '',
                  'Steps:',
                  `1. Read the resource template ${resolvedPositionUri}.`,
                  `   Alternative: call get_position with ${tsArg}.`,
                  `   Bridge fallback: getResourceByUri({ uri: "${timestamp ? `body://position/${timestamp}` : 'body://position/<epoch-ms>'}" }).`,
                  '2. Explain the position in AU coordinates (xAU, yAU) and the orbital angle in radians.'
                ].join('\n')
              }
            }
          ]
        };
      }
    },
    {
      name: 'compare-with',
      title: `Compare ${body.name} position with another body`,
      description: `Multi-server guidance: obtain ${body.name} position and compare with another celestial body.`,
      argsSchema: {
        other: z
          .enum(['sun', 'moon', 'earth'])
          .describe('The other body to compare with (sun, moon, or earth).'),
        timestamp: z
          .string()
          .optional()
          .describe('Epoch milliseconds as a string. If omitted, the agent should use the current time.')
      },
      render: ({ other, timestamp }) => {
        const at = timestamp ? `timestamp ${timestamp} (epoch ms)` : 'the current time (Date.now())';
        const tsArg = timestamp ? `{ "timestamp": ${timestamp} }` : 'no arguments (defaults to now)';
        const otherPort = constellationPorts[other];
        const otherUrl = `http://localhost:${otherPort}/mcp`;
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: [
                  `Compare the position of ${body.name} with ${other} at ${at}.`,
                  '',
                  'Steps:',
                  `1. Obtain the position of ${body.name}:`,
                  `   - Call get_position with ${tsArg}.`,
                  `   - Bridge fallback: getResourceByUri({ uri: "body://position/<epoch-ms>" }).`,
                  `2. Consult the ${other} body-server to get its position:`,
                  `   - The ${other} server is available at ${otherUrl}.`,
                  `   - You can find all constellation ports in the server://card resource.`,
                  `   - Call get_position on the ${other} server with the same timestamp.`,
                  '3. Calculate the distance between the two bodies using the Euclidean distance in AU.',
                  '4. Report the distance and relative positions in a concise summary.'
                ].join('\n')
              }
            }
          ]
        };
      }
    }
  ];
}

function toPublicDescriptor({ name, uri, mimeType, description }) {
  return { name, uri, mimeType, description };
}

function toPublicTemplateDescriptor({ name, uriTemplate, mimeType, description }) {
  return { name, uriTemplate, mimeType, description };
}

function renderPromptText(entry, args = {}) {
  const result = entry.render(args);
  if (typeof result === 'string') return result;
  return result?.messages?.[0]?.content?.text ?? String(result);
}

function toPublicPromptDescriptor({ name, title, description, argsSchema }) {
  return { name, title, description, arguments: Object.keys(argsSchema || {}) };
}

function parseTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: `Invalid timestamp "${value}": must be an integer epoch milliseconds` };
  }
  return { timestamp: n };
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

function orbitalAngle(timestamp, periodDays) {
  return ((timestamp / (periodDays * MS_PER_DAY)) * TWO_PI) % TWO_PI;
}

export function computePosition(body, timestamp) {
  if (!body.orbitalPeriodDays || body.orbitRadiusAU === 0) {
    return {
      body: body.name,
      timestamp,
      angleRad: 0,
      position: { xAU: 0, yAU: 0 },
      orbitRadiusAU: body.orbitRadiusAU,
      orbitalPeriodDays: body.orbitalPeriodDays ?? null
    };
  }
  const angleRad = orbitalAngle(timestamp, body.orbitalPeriodDays);
  let xAU = body.orbitRadiusAU * Math.cos(angleRad);
  let yAU = body.orbitRadiusAU * Math.sin(angleRad);
  if (body.parent) {
    const parentAngle = orbitalAngle(timestamp, body.parent.orbitalPeriodDays);
    xAU += body.parent.orbitRadiusAU * Math.cos(parentAngle);
    yAU += body.parent.orbitRadiusAU * Math.sin(parentAngle);
  }
  return {
    body: body.name,
    timestamp,
    angleRad,
    position: { xAU, yAU },
    orbitRadiusAU: body.orbitRadiusAU,
    orbitalPeriodDays: body.orbitalPeriodDays
  };
}

export function computeRotation(body, timestamp) {
  return {
    body: body.name,
    timestamp,
    rotationAngleRad: orbitalAngle(timestamp, body.rotationPeriodDays),
    rotationPeriodDays: body.rotationPeriodDays
  };
}

function jsonContent(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function buildMcpServer(body) {
  const server = new McpServer({ name: body.name, version: SERVER_VERSION });
  const registry = getResourceRegistry(body);
  const templateRegistry = getTemplateRegistry(body);
  const promptRegistry = getPromptRegistry(body);

  for (const entry of registry) {
    server.registerResource(
      entry.name,
      entry.uri,
      { title: entry.title, description: entry.description, mimeType: entry.mimeType },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: entry.mimeType,
            text: JSON.stringify(entry.read(), null, 2)
          }
        ]
      })
    );
  }

  for (const entry of templateRegistry) {
    server.registerResource(
      entry.name,
      new ResourceTemplate(entry.uriTemplate, { list: undefined }),
      { title: entry.title, description: entry.description, mimeType: entry.mimeType },
      async (uri, variables) => {
        const payload = entry.read(variables);
        if (payload.error) {
          throw new Error(payload.error);
        }
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: entry.mimeType,
              text: JSON.stringify(payload, null, 2)
            }
          ]
        };
      }
    );
  }

  const timestampInput = {
    timestamp: z
      .number()
      .optional()
      .describe('Epoch milliseconds. Defaults to Date.now(). Results are deterministic for a given timestamp.')
  };

  server.registerTool(
    'get_position',
    {
      title: `Get ${body.name} position`,
      description: `Deterministic heliocentric position of ${body.name} at a given timestamp (epoch ms). Returns orbital angle and cartesian coordinates in AU.`,
      inputSchema: timestampInput
    },
    async ({ timestamp }) => jsonContent(computePosition(body, timestamp ?? Date.now()))
  );

  server.registerTool(
    'get_rotation',
    {
      title: `Get ${body.name} rotation`,
      description: `Deterministic rotation angle of ${body.name} around its own axis at a given timestamp (epoch ms).`,
      inputSchema: timestampInput
    },
    async ({ timestamp }) => jsonContent(computeRotation(body, timestamp ?? Date.now()))
  );

  server.registerTool(
    'getResourcesUris',
    {
      title: `List ${body.name} resource URIs`,
      description: `Returns the URIs of MCP resources registered by the ${body.name} server. Use getResourceByUri to read the JSON payload.`,
      inputSchema: {}
    },
    async () => jsonContent({
      body: body.name,
      uris: registry.map((r) => r.uri),
      resources: registry.map(toPublicDescriptor)
    })
  );

  server.registerTool(
    'getResourceTemplates',
    {
      title: `List ${body.name} resource templates`,
      description: `Returns the URI templates of MCP resource templates registered by the ${body.name} server. Substitute variables (e.g. timestamp) and use getResourceByUri to read the JSON payload.`,
      inputSchema: {}
    },
    async () => jsonContent({
      body: body.name,
      uriTemplates: templateRegistry.map((t) => t.uriTemplate),
      resourceTemplates: templateRegistry.map(toPublicTemplateDescriptor)
    })
  );

  server.registerTool(
    'getResourceByUri',
    {
      title: `Read ${body.name} resource by URI`,
      description: `Reads a registered MCP resource or template-resolved URI and returns its JSON payload. URI must be a fixed resource URI or a resolved template URI (e.g. body://position/1700000000000).`,
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
        const payload = matched.entry.read(matched.variables);
        if (payload.error) {
          return {
            isError: true,
            content: [{ type: 'text', text: payload.error }]
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
      title: `List ${body.name} MCP prompts`,
      description: `Returns the names, titles, descriptions and argument keys of MCP prompts registered by the ${body.name} server. Use getPrompt to read the rendered text.`,
      inputSchema: {}
    },
    async () => jsonContent({
      body: body.name,
      prompts: promptRegistry.map(toPublicPromptDescriptor)
    })
  );

  server.registerTool(
    'getPrompt',
    {
      title: `Read ${body.name} MCP prompt by name`,
      description: `Renders an MCP prompt by name and returns its text. Fallback for clients that cannot use native getPrompt.`,
      inputSchema: {
        name: z.string().describe('Prompt name (MCP identifier).'),
        arguments: z
          .record(z.string())
          .optional()
          .describe('Optional prompt arguments, e.g. { "timestamp": "1700000000000" }.')
      }
    },
    async ({ name, arguments: promptArgs }) => {
      const entry = promptRegistry.find((p) => p.name === name);
      if (!entry) {
        const available = promptRegistry.map((p) => p.name);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown prompt name "${name}". Available: ${available.join(', ')}`
            }
          ]
        };
      }
      return jsonContent({
        name,
        text: renderPromptText(entry, promptArgs || {})
      });
    }
  );

  for (const entry of promptRegistry) {
    server.registerPrompt(
      entry.name,
      {
        title: entry.title,
        description: entry.description,
        argsSchema: entry.argsSchema
      },
      (args) => entry.render(args || {})
    );
  }

  return server;
}

/**
 * Creates the express app and lifecycle helpers for one body server.
 * Returns { name, port, app, start() } where start() resolves to
 * { name, port, url, close() }.
 */
export function createBodyServer(body) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/mcp/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      server: body.name,
      name: body.name,
      version: SERVER_VERSION,
      capabilities: CAPABILITIES
    });
  });

  app.post('/mcp', async (req, res) => {
    // Stateless mode: fresh server + transport per request.
    const mcpServer = buildMcpServer(body);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => {
      transport.close();
      mcpServer.close();
    });
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(`[${body.name}] Error handling MCP request:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
        });
      }
    }
  });

  // Stateless servers do not support SSE streams or session termination.
  const methodNotAllowed = (req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed in stateless mode' },
      id: null
    });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  function start() {
    return new Promise((resolve, reject) => {
      const httpServer = app.listen(body.port, () => {
        resolve({
          name: body.name,
          port: body.port,
          url: `http://localhost:${body.port}/mcp`,
          close: () =>
            new Promise((res2, rej2) => {
              httpServer.close((err) => (err ? rej2(err) : res2()));
            })
        });
      });
      httpServer.on('error', reject);
    });
  }

  return { name: body.name, port: body.port, app, start };
}
