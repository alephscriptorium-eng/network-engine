/**
 * Shared factory for a celestial-body MCP server over Streamable HTTP.
 *
 * Transport contract (mirrors the edge-mcp contract used by the catalog
 * extractor): POST {base}/mcp for MCP traffic, GET {base}/mcp/health for
 * discovery. Stateless HTTP: one persistent McpServer per process; each POST
 * gets an ephemeral transport.
 */

import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mountMCPRoute, registerCommonMCP, getMcpCapabilities, createServerCardResource, updateServerCard, createMcpHttpStart } from '@zeus/presets-sdk';
import { SERVER_VERSION } from './bodies.mjs';
import * as logic from './logic.mjs';

export { computePosition, computeRotation } from './logic.mjs';

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
    createServerCardResource(body.name)
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
        return logic.computePosition(body, parsed.timestamp);
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
        return logic.computeRotation(body, parsed.timestamp);
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

function parseTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: `Invalid timestamp "${value}": must be an integer epoch milliseconds` };
  }
  return { timestamp: n };
}

function buildMcpServer(body) {
  const server = new McpServer({ name: body.name, version: SERVER_VERSION });
  const registry = getResourceRegistry(body);
  const templateRegistry = getTemplateRegistry(body);
  const promptRegistry = getPromptRegistry(body);

  logic.buildMcp(server, body);

  registerCommonMCP(server, {
    serverName: body.name,
    registry,
    templateRegistry,
    promptRegistry
  });

  updateServerCard(registry, server, {
    name: body.name,
    version: SERVER_VERSION,
    port: body.port
  });

  return { server };
}

/**
 * Creates the express app and lifecycle helpers for one body server.
 * Returns { name, port, app, start() } where start() resolves to
 * { name, port, url, close() }.
 */
export function createBodyServer(body) {
  const { server: mcpServer } = buildMcpServer(body);
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/mcp/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      server: body.name,
      name: body.name,
      version: SERVER_VERSION,
      capabilities: getMcpCapabilities(mcpServer)
    });
  });

  mountMCPRoute(app, { mcpServer, logLabel: body.name });

  const start = createMcpHttpStart(app, { name: body.name, port: body.port, mcpServer });

  return { name: body.name, port: body.port, app, start };
}
