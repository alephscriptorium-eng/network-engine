import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk';
import { resolveNodo, resolveOldid, resolveRegistrosForNodo, resolveRegistrosForYear } from './loader.mjs';
import { runCacheWikitext } from './cache-wikitext.mjs';

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
        description: `Closest Wikipedia revision oldid by **calendar edit year** at or before the end of the given year (2001–2026). Returns error outside coverage. Distinct from get_registros_for_year.`,
        inputSchema: yearInput
      },
      async ({ year }) => jsonContent(resolveOldid(lineData.satellite, year))
    );

    const limitInput = {
      limit: z.number().optional().describe('Max registros to return (default: all).')
    };

    server.registerTool(
      'get_registros_for_nodo',
      {
        title: `Get thematic registros for nodo`,
        description: `Lists WP revision registros for sections mapped to a Villacañas nodo (P01–P24).`,
        inputSchema: {
          nodo_id: z.string().describe('Nodo id, e.g. P03.'),
          ...limitInput
        }
      },
      async ({ nodo_id, limit }) => jsonContent(resolveRegistrosForNodo(lineData, nodo_id, { limit }))
    );

    server.registerTool(
      'get_registros_for_year',
      {
        title: `Get thematic registros for historical year`,
        description: `Resolves nodo at historical year, then lists thematic WP registros for that nodo. Works outside WP calendar coverage.`,
        inputSchema: {
          ...yearInput,
          ...limitInput
        }
      },
      async ({ year, limit }) => jsonContent(resolveRegistrosForYear(lineData, year, { limit }))
    );

    server.registerTool(
      'cache_wikitext',
      {
        title: 'Cache WP wikitext snapshot',
        description:
          'Fetch a single Wikipedia oldid into cache/snapshots via fetch_snapshot.py. Returns immediately (async fetch); poll linea://wikitext/{oldid} until cached.',
        inputSchema: {
          oldid: z.number().describe('Wikipedia revision oldid to fetch and cache.'),
          force: z.boolean().optional().describe('Re-fetch even if already cached.')
        }
      },
      async ({ oldid, force }) => jsonContent(await runCacheWikitext(lineData, { oldid, force }))
    );
  }
}
