/**
 * MCP server factory for the firehose volume (read-only DISK_01).
 * POST /mcp + GET /mcp/health — same contract as linea-system and solar-system.
 */

import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  mountMCPRoute,
  registerCommonMCP,
  getMcpCapabilities,
  createServerCardResource,
  updateServerCard,
  createMcpHttpStart
} from '@zeus/presets-sdk';
import { SERVER_NAME, SERVER_VERSION } from './config.mjs';
import * as logic from './logic.mjs';

function buildMcpServer(config) {
  const server = new McpServer({ name: config.name, version: SERVER_VERSION });
  const registry = [...logic.getResourceRegistry(), createServerCardResource(config.name)];
  const templateRegistry = logic.getTemplateRegistry();
  const promptRegistry = logic.getPromptRegistry();

  logic.buildMcp(server);

  registerCommonMCP(server, {
    serverName: config.name,
    registry,
    templateRegistry,
    promptRegistry
  });

  updateServerCard(registry, server, {
    name: config.name,
    version: SERVER_VERSION,
    port: config.port
  });

  return { server };
}

/**
 * @param {object} [config]
 * @returns {{ name: string, port: number, app: import('express').Express, start: () => Promise<{ name: string, port: number, url: string, close: () => Promise<void> }> }}
 */
export function createServer(config) {
  const { server: mcpServer } = buildMcpServer(config);
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/mcp/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      server: config.name,
      name: config.name,
      version: SERVER_VERSION,
      capabilities: getMcpCapabilities(mcpServer)
    });
  });

  mountMCPRoute(app, { mcpServer, logLabel: config.name });

  const start = createMcpHttpStart(app, {
    name: config.name,
    port: config.port,
    mcpServer
  });

  return { name: config.name, port: config.port, app, start };
}

export { SERVER_NAME, SERVER_VERSION };
