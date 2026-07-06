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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SERVER_VERSION } from './bodies.mjs';

const MS_PER_DAY = 86400000;
const TWO_PI = 2 * Math.PI;

const CAPABILITIES = { tools: 4, resources: 2, prompts: 1 };

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

function toPublicDescriptor({ name, uri, mimeType, description }) {
  return { name, uri, mimeType, description };
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
    'getResourceByUri',
    {
      title: `Read ${body.name} resource by URI`,
      description: `Reads a registered MCP resource by URI and returns its JSON payload. URI must be one returned by getResourcesUris.`,
      inputSchema: {
        uri: z.string().describe('Registered resource URI. Use one returned by getResourcesUris.')
      }
    },
    async ({ uri }) => {
      const entry = registry.find((r) => r.uri === uri);
      if (!entry) {
        const availableUris = registry.map((r) => r.uri);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown resource URI "${uri}". Available: ${availableUris.join(', ')}`
            }
          ]
        };
      }
      return jsonContent(entry.read());
    }
  );

  server.registerPrompt(
    'report-status',
    {
      title: `${body.name} status report`,
      description: `Instructions for an agent to produce a status report for ${body.name} at a given timestamp.`,
      argsSchema: {
        timestamp: z
          .string()
          .optional()
          .describe('Epoch milliseconds as a string. If omitted, the agent should use the current time.')
      }
    },
    ({ timestamp }) => {
      const at = timestamp ? `timestamp ${timestamp} (epoch ms)` : 'the current time (Date.now())';
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
                `2. Call the tool get_position with ${timestamp ? `{ "timestamp": ${timestamp} }` : 'no arguments (defaults to now)'} to get its heliocentric position.`,
                `3. Call the tool get_rotation with ${timestamp ? `{ "timestamp": ${timestamp} }` : 'no arguments (defaults to now)'} to get its rotation angle.`,
                '4. Write a concise status report combining the fact card, the position (angle and x/y in AU) and the rotation state at that instant.'
              ].join('\n')
            }
          }
        ]
      };
    }
  );

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
