import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk';
import { resolveNodo, resolveOldid } from './loader.mjs';

/**
 * Registers linea-poder domain tools on an McpServer.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ config: object, lineData: object }} ctx
 */
export function buildMcp(server, { config, lineData }) {
  const yearInput = {
    year: z
      .number()
      .describe('Historical year (fraction allowed). Results are deterministic for a given year.')
  };

  server.registerTool(
    'get_nodo',
    {
      title: `Get nodo at year`,
      description: `Deterministic Villacañas nodo resolution for a historical year: id, parte, etiqueta, tesis and articulos_wp.`,
      inputSchema: yearInput
    },
    async ({ year }) => jsonContent(resolveNodo(lineData, year, config.coverage))
  );

  if (config.kind === 'satelite' && lineData.satellite) {
    server.registerTool(
      'get_oldid',
      {
        title: `Get WP oldid at year`,
        description: `Closest Wikipedia revision oldid at or before the end of the given year (2001–2026). Returns empty error outside coverage.`,
        inputSchema: yearInput
      },
      async ({ year }) => jsonContent(resolveOldid(lineData.satellite, year))
    );
  }
}
