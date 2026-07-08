/**
 * Shared factory for a linea-poder MCP server over Streamable HTTP.
 *
 * Transport contract (mirrors solar-system body-server): POST {base}/mcp for MCP
 * traffic, GET {base}/mcp/health for discovery. Stateless HTTP: one persistent
 * McpServer per process; each POST gets an ephemeral transport.
 */

import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mountMCPRoute, registerCommonMCP, promptMessages, getMcpCapabilities, createServerCardResource, updateServerCard, createMcpHttpStart } from '@zeus/presets-sdk';
import { resolveNodo, resolveOldid, resolveParte, readWikitext, readRegistro } from './loader.mjs';
import { SERVER_VERSION } from './lineas.mjs';
import * as logic from './logic.mjs';

function buildLineaInfo(config, lineData) {
  const coverage = config.kind === 'satelite' ? lineData.satellite.coverage : lineData.coverage;
  return {
    name: config.name,
    kind: config.kind,
    lineaId: config.lineaId,
    etiqueta: lineData.entry.etiqueta,
    autor_tronco: lineData.entry.autor_tronco ?? lineData.manifest.meta?.autor_tronco,
    coverage,
    nodo_count: lineData.entry.nodo_count ?? Object.keys(lineData.nodos).length,
    ...(config.kind === 'satelite'
      ? {
          satellite: lineData.satellite.meta?.title,
          registro_count: lineData.satellite.meta?.registro_count
        }
      : {})
  };
}

function parseYear(value) {
  const y = Number(value);
  if (!Number.isFinite(y)) {
    return { error: `Invalid year "${value}": must be a number` };
  }
  return { year: y };
}

function getResourceRegistry(config, lineData) {
  const resources = [
    {
      name: 'linea-info',
      uri: 'linea://info',
      title: `${config.name} info`,
      mimeType: 'application/json',
      description: `Static fact card for the "${config.name}" linea-poder server: coverage, nodos and metadata.`,
      read: () => buildLineaInfo(config, lineData)
    },
    createServerCardResource(config.name)
  ];

  if (config.kind === 'satelite' && lineData.satellite) {
    resources.push({
      name: 'linea-cache-stats',
      uri: 'linea://cache/stats',
      title: `${config.name} cache stats`,
      mimeType: 'application/json',
      description: `Cache coverage statistics: registro_count, curated_registros, cached_wikitexts, cached_oldids, milestones_sin_cuerpo and coverage_pct.`,
      read: () => lineData.satellite.cacheStats
    });
  }

  return resources;
}

function getTemplateRegistry(config, lineData) {
  const templates = [
    {
      name: 'linea-nodo',
      uriTemplate: 'linea://nodo/{year}',
      title: `Nodo at year`,
      mimeType: 'application/json',
      description: `Resolves the Villacañas nodo (Px), tesis and articulos_wp for a historical year on the trunk.`,
      read: (variables) => {
        const parsed = parseYear(variables.year);
        if (parsed.error) return parsed;
        return resolveNodo(lineData, parsed.year, config.coverage);
      }
    },
    {
      name: 'linea-parte',
      uriTemplate: 'linea://parte/{id}',
      title: `Parte I a IV`,
      mimeType: 'application/json',
      description: `Returns metadata for a parte (I, II, III or IV): title, year range and nodos.`,
      read: (variables) => resolveParte(lineData, variables.id)
    }
  ];

  if (config.kind === 'satelite' && lineData.satellite) {
    templates.push(
      {
        name: 'linea-oldid',
        uriTemplate: 'linea://oldid/{year}',
        title: `WP oldid at year`,
        mimeType: 'application/json',
        description: `Closest Wikipedia revision (oldid + timestamp) at or before the end of the given year. Coverage 2001-2026 only.`,
        read: (variables) => {
          const parsed = parseYear(variables.year);
          if (parsed.error) return parsed;
          return resolveOldid(lineData.satellite, parsed.year);
        }
      },
      {
        name: 'linea-wikitext',
        uriTemplate: 'linea://wikitext/{oldid}',
        title: `WP wikitext snapshot`,
        mimeType: 'application/json',
        description: `Cached wikitext body for a specific Wikipedia oldid. Returns error if not cached. Use linea://cache/stats to see cached_oldids.`,
        read: async (variables) => readWikitext(lineData.satellite, variables.oldid)
      },
      {
        name: 'linea-registro',
        uriTemplate: 'linea://registro/{id}',
        title: `Curated registro annotations`,
        mimeType: 'application/json',
        description: `Curated annotations (registro.md and delta.md) for a specific registro_id. Returns error if not curated. Use linea://cache/stats to see curated_registros count.`,
        read: async (variables) => readRegistro(lineData.satellite, variables.id)
      }
    );
  }

  return templates;
}

function getPromptRegistry(config, lineData) {
  const commonPrompts = [
    {
      name: 'explore-server',
      title: `${config.name} server exploration`,
      description: `Guided presentation of the server: read linea://info and server://card, list templates, summarize what can be requested.`,
      argsSchema: {},
      kinds: ['tronco', 'satelite'],
      render: () => {
        const steps = [
          `Explore the ${config.name} MCP server capabilities.`,
          '',
          'Steps:',
          '1. Read linea://info for coverage and metadata.',
          '   Bridge fallback: getResourceByUri({ uri: "linea://info" }).',
          '2. Read server://card for server capabilities (tools, resources, templates, prompts).',
          '   Bridge fallback: getResourceByUri({ uri: "server://card" }).',
          '3. List resource templates with getResourceTemplates (or listResourceTemplates MCP call).',
          '4. Write a concise summary: what this server provides, how to request data, key URIs and tools.'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'report-nodo',
      title: `${config.name} nodo report`,
      description: `Instructions for an agent to produce a nodo report for a given historical year.`,
      argsSchema: {
        year: z
          .string()
          .optional()
          .describe('Historical year as a string. If omitted, the agent should ask or pick a year in coverage.')
      },
      kinds: ['tronco', 'satelite'],
      render: ({ year }) => {
        const at = year ? `year ${year}` : 'a year within coverage';
        const nodoUri = year ? `linea://nodo/${year}` : 'linea://nodo/{year}';
        const oldidUri =
          config.kind === 'satelite' && year
            ? `linea://oldid/${year}`
            : config.kind === 'satelite'
              ? 'linea://oldid/{year}'
              : null;
        const steps = [
          `Produce a nodo report for ${config.name} at ${at}.`,
          '',
          'Steps:',
          '1. Read linea://info for coverage and metadata.',
          '   Bridge fallback: getResourceByUri({ uri: "linea://info" }).',
          `2. Resolve the Villacañas nodo at ${at}:`,
          `   - Preferred: read ${nodoUri}.`,
          `   - Alternative: call get_nodo with { "year": ${year ?? '<year>'} }.`,
          `   - Bridge fallback: getResourceByUri({ uri: "${year ? `linea://nodo/${year}` : 'linea://nodo/<year>'}" }).`
        ];
        if (oldidUri) {
          steps.push(
            `3. Resolve the WP oldid at ${at}:`,
            `   - Preferred: read ${oldidUri}.`,
            `   - Alternative: call get_oldid with { "year": ${year ?? '<year>'} }.`,
            '4. (Optional) If you want the wikitext body, read linea://wikitext/{oldid}.',
            '   If not cached, propose a viaje: read linea://cache/stats and negotiate budget.',
            '5. Write a concise report combining nodo (id, etiqueta, tesis) and oldid (revision id + timestamp).'
          );
        } else {
          steps.push('3. Write a concise report with nodo id, etiqueta, parte and tesis_villacañas.');
        }
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'report-parte',
      title: `${config.name} parte report`,
      description: `Instructions to produce a report for a parte (I, II, III or IV).`,
      argsSchema: {
        id: z.string().describe('Parte id: I, II, III or IV.')
      },
      kinds: ['tronco', 'satelite'],
      render: ({ id }) => {
        const steps = [
          `Produce a parte report for ${config.name}, parte ${id}.`,
          '',
          'Steps:',
          `1. Read linea://parte/${id}.`,
          `   Bridge fallback: getResourceByUri({ uri: "linea://parte/${id}" }).`,
          '2. For each nodo in the parte, read linea://nodo/{year} (using año_ini or a representative year).',
          '3. Synthesize a report with parte metadata (title, year range) and a summary of its nodos.'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'timeline-nodos',
      title: `${config.name} nodos timeline`,
      description: `Instructions to produce a chronological timeline of nodos for a year range.`,
      argsSchema: {
        from: z.string().optional().describe('Starting year (optional).'),
        to: z.string().optional().describe('Ending year (optional).')
      },
      kinds: ['tronco', 'satelite'],
      render: ({ from, to }) => {
        const fromY = from ? `year ${from}` : 'coverage.min';
        const toY = to ? `year ${to}` : 'coverage.max';
        const steps = [
          `Produce a chronological timeline of nodos for ${config.name} from ${fromY} to ${toY}.`,
          '',
          'Steps:',
          '1. Read linea://info to get coverage and nodo list.',
          '2. Identify key years for each nodo (año_ini, año_fin) within the range.',
          '3. For each nodo, read linea://nodo/{year} for a representative year.',
          '4. Produce a chronology: year → nodo (id, etiqueta, tesis).'
        ];
        return promptMessages(steps.join('\n'));
      }
    }
  ];

  const satelitePrompts = [
    {
      name: 'report-oldid',
      title: `${config.name} oldid report`,
      description: `Instructions to produce an oldid report for a given year, including wikitext if cached.`,
      argsSchema: {
        year: z.string().describe('Historical year (2001-2026).')
      },
      kinds: ['satelite'],
      render: ({ year }) => {
        const steps = [
          `Produce an oldid report for ${config.name} at year ${year}.`,
          '',
          'Steps:',
          `1. Resolve linea://oldid/${year} to get the oldid and timestamp.`,
          `   Bridge fallback: getResourceByUri({ uri: "linea://oldid/${year}" }).`,
          `2. Read linea://wikitext/{oldid} to get the cached wikitext body.`,
          `   If not cached, the error will explain the viaje protocol (read linea://cache/stats).`,
          '3. Write a report with oldid, timestamp, and wikitext_length (or error if not cached).'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'cache-status',
      title: `${config.name} cache status`,
      description: `Instructions to read cache coverage stats and explain the viaje protocol.`,
      argsSchema: {},
      kinds: ['satelite'],
      render: () => {
        const steps = [
          `Read cache coverage statistics for ${config.name}.`,
          '',
          'Steps:',
          '1. Read linea://cache/stats.',
          '   Bridge fallback: getResourceByUri({ uri: "linea://cache/stats" }).',
          '2. Report coverage: cached_wikitexts / registro_count, coverage_pct, milestones_sin_cuerpo.',
          '3. Explain the viaje protocol: propose waves (A: nodo anchors, B: milestones, C: parte sampling).',
          '4. Suggest a budget N (queries to Wikipedia) and ask user for approval before fetching.'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'propose-viaje',
      title: `${config.name} viaje proposal`,
      description: `Guide agent to draft a viaje proposal: read stats, choose wave, estimate queries, request user approval.`,
      argsSchema: {
        goal: z.string().optional().describe('Viaje goal: A (nodo anchors), B (milestones), C (parte sampling), or custom.')
      },
      kinds: ['satelite'],
      render: ({ goal }) => {
        const targetGoal = goal ?? 'to be determined (A, B, or C)';
        const steps = [
          `Draft a viaje proposal for ${config.name} with goal: ${targetGoal}.`,
          '',
          'Steps:',
          '1. Read linea://cache/stats to understand current coverage.',
          '2. Choose a wave strategy:',
          '   - A: nodo anchors (año_ini for each nodo P01→P24).',
          '   - B: milestones without body (milestones_sin_cuerpo).',
          '   - C: parte sampling (e.g., 5 years per parte).',
          '3. Estimate queries N needed (count of oldids to fetch).',
          '4. Draft proposal: goal, wave, estimated queries, expected coverage gain.',
          '5. DO NOT fetch anything. Present the proposal to the user and await approval.'
        ];
        return promptMessages(steps.join('\n'));
      }
    }
  ];

  const allPrompts = [...commonPrompts, ...satelitePrompts];
  return allPrompts.filter((p) => p.kinds.includes(config.kind));
}

function buildMcpServer(config, lineData) {
  const server = new McpServer({ name: config.name, version: SERVER_VERSION });
  const registry = getResourceRegistry(config, lineData);
  const templateRegistry = getTemplateRegistry(config, lineData);
  const promptRegistry = getPromptRegistry(config, lineData);

  logic.buildMcp(server, { config, lineData });

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
 * Creates the express app and lifecycle helpers for one linea server.
 * Returns { name, port, app, start() } where start() resolves to
 * { name, port, url, close() }.
 */
export function createServer(config, lineData) {
  const { server: mcpServer } = buildMcpServer(config, lineData);
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/mcp/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      server: config.name,
      name: config.name,
      version: SERVER_VERSION,
      capabilities: getMcpCapabilities(mcpServer)
    });
  });

  mountMCPRoute(app, { mcpServer, logLabel: config.name });

  const start = createMcpHttpStart(app, { name: config.name, port: config.port, mcpServer });

  return { name: config.name, port: config.port, app, start };
}
