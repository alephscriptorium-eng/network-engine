/**
 * MCP server factory for @zeus/player-ui-debug monitor over Streamable HTTP.
 */

import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  mountMCPRoute,
  registerCommonMCP,
  promptMessages,
  getMcpCapabilities,
  createServerCardResource,
  updateServerCard,
  createMcpHttpStart
} from '@zeus/presets-sdk';
import { getDebugConfig } from './config.mjs';
import * as logic from './logic.mjs';
import * as logicSession from './logic-session.mjs';

export const SERVER_NAME = 'player-ui-debug';
export const SERVER_VERSION = '0.1.0';

function buildPlayerInfo(config, stateStore) {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    playerUiUrl: config.baseUrl,
    sessionUrl: config.sessionUrl,
    mcpPort: config.mcpPort,
    mcpUrl: `http://${config.mcpHost}:${config.mcpPort}/mcp`,
    debugServer: config.debugServer,
    refreshHz: config.refreshHz,
    restPollMs: config.restPollMs,
    maxEvents: config.maxEvents,
    defaultCaso: config.defaultCaso,
    monitorUptimeMs: stateStore.getMonitorUptime()
  };
}

function getResourceRegistry(stateStore, config, poller) {
  return [
    {
      name: 'player-info',
      uri: 'player://info',
      title: 'Player debug monitor info',
      mimeType: 'application/json',
      description: 'Monitor metadata: player-ui URLs, poll intervals, MCP port, and uptime.',
      read: () => buildPlayerInfo(config, stateStore)
    },
    {
      name: 'player-snapshot',
      uri: 'player://snapshot',
      title: 'Player monitor snapshot',
      mimeType: 'application/json',
      description:
        'Canonical agent-facing composite: session, decks, health, infrastructure, servers, and typed events.',
      read: () => stateStore.getSnapshot()
    },
    {
      name: 'player-session',
      uri: 'player://session',
      title: 'Player session state',
      mimeType: 'application/json',
      description: 'Full session:state payload from player-ui socket (phase, playhead, decks).',
      read: () => stateStore.getSession()
    },
    {
      name: 'player-health',
      uri: 'player://health',
      title: 'Player monitor health',
      mimeType: 'application/json',
      description: 'Socket connection status plus REST health poll timestamps.',
      read: () => stateStore.getHealth()
    },
    {
      name: 'player-events',
      uri: 'player://events',
      title: 'Player monitor events',
      mimeType: 'application/json',
      description: 'Ring buffer of typed socket/emit events (newest first).',
      read: () => ({ events: stateStore.getEvents(), count: stateStore.getEvents().length })
    },
    {
      name: 'player-servers',
      uri: 'player://servers',
      title: 'Player server catalog',
      mimeType: 'application/json',
      description: 'Merged socket catalog:servers and REST /api/servers.',
      read: () => stateStore.getServers()
    },
    {
      name: 'player-aleph-anchors',
      uri: 'player://aleph/anchors',
      title: 'ALEPH anchors grid',
      mimeType: 'application/json',
      description: 'REST /api/aleph/anchors — P01–P24 grid and cache stats.',
      read: () => stateStore.getAnchors()
    },
    {
      name: 'player-aleph-medicion',
      uri: 'player://aleph/medicion',
      title: 'ALEPH medicion (default caso)',
      mimeType: 'application/json',
      description: `REST medicion for default caso (${config.defaultCaso}).`,
      read: () => stateStore.getMedicion(config.defaultCaso)
    },
    createServerCardResource(SERVER_NAME)
  ];
}

function getTemplateRegistry(stateStore, config, poller) {
  return [
    {
      name: 'player-deck',
      uriTemplate: 'player://deck/{deckId}',
      title: 'Deck state',
      mimeType: 'application/json',
      description: 'Deck A or B with resolved payload from current session.',
      read: (variables) => {
        const deckId = variables.deckId?.toUpperCase();
        if (deckId !== 'A' && deckId !== 'B') {
          return { error: `Invalid deckId "${variables.deckId}": use A or B` };
        }
        const deck = stateStore.getDeck(deckId);
        if (!deck) {
          return { deckId, phase: 'empty', resolved: null };
        }
        return { deckId, ...deck };
      }
    },
    {
      name: 'player-aleph-medicion-caso',
      uriTemplate: 'player://aleph/medicion/{casoId}',
      title: 'ALEPH medicion by caso',
      mimeType: 'application/json',
      description: 'REST /api/aleph/medicion/:casoId — fetches on demand if not cached.',
      read: async (variables) => poller.fetchMedicion(variables.casoId)
    },
    {
      name: 'player-events-limit',
      uriTemplate: 'player://events/{limit}',
      title: 'Recent events',
      mimeType: 'application/json',
      description: 'Last N typed events from the monitor ring buffer.',
      read: (variables) => {
        const limit = Number(variables.limit);
        const events = stateStore.getEvents(limit);
        return { limit: Number.isFinite(limit) ? limit : config.maxEvents, events, count: events.length };
      }
    }
  ];
}

function getPromptRegistry(config) {
  return [
    {
      name: 'explore-monitor',
      title: 'Explore player debug monitor',
      description:
        'Onboarding: read player://info and server://card, list templates, summarize monitor capabilities.',
      argsSchema: {},
      render: () => {
        const steps = [
          'Explore the player-ui-debug MCP monitor capabilities.',
          '',
          'Steps:',
          '1. Read player://info for player-ui URLs, poll intervals, and MCP port.',
          '   Bridge fallback: getResourceByUri({ uri: "player://info" }).',
          '2. Read server://card for server capabilities (tools, resources, templates, prompts).',
          '   Bridge fallback: getResourceByUri({ uri: "server://card" }).',
          '3. List resource templates with getResourceTemplates.',
          '4. Summarize: this server mirrors the TOP console monitor — poll player://snapshot for live Tablero state.',
          '5. Note action tools proxy socket events to player-ui (:3013); refresh_snapshot forces REST poll.'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'report-session',
      title: 'Report Tablero session',
      description: 'Workflow: poll player://snapshot and summarize phase, year, decks for operator alignment.',
      argsSchema: {},
      render: () => {
        const steps = [
          'Produce a Tablero ALEPH session report for operator alignment.',
          '',
          'Steps:',
          '1. Read player://snapshot (canonical composite).',
          '   Bridge fallback: getResourceByUri({ uri: "player://snapshot" }).',
          '2. Extract: session.phase, playhead.year, playhead.playing, sync flag.',
          '3. For each deck A/B: phase, serverName, resolved nodo id, wikitext cache status.',
          '4. Note REST health and any degraded decks.',
          '5. Write a concise summary the operator can confirm against the browser Tablero.'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'diagnose-deck',
      title: 'Diagnose deck issues',
      description: 'Inspect player://deck/{deckId} for degraded state, resolve errors, and wikitext status.',
      argsSchema: {
        deckId: z.enum(['A', 'B']).describe('Deck id: A or B.')
      },
      render: ({ deckId }) => {
        const uri = `player://deck/${deckId}`;
        const steps = [
          `Diagnose deck ${deckId} on the Tablero monitor.`,
          '',
          'Steps:',
          `1. Read ${uri} for full deck state and resolved payload.`,
          `   Bridge fallback: getResourceByUri({ uri: "${uri}" }).`,
          '2. If phase is degraded, check player://servers for server connectivity.',
          '3. Read player://health for socket + REST status.',
          '4. Inspect recent player://events/16 for deck:resolved and wikitext errors.',
          '5. Report: phase, serverName, nodo, registros count, wikitext cached/miss, last resolve timing.',
          '6. Suggest fixes (reconnect server, reload deck, cache wikitext via wikitext_cache tool).'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'sync-with-operator',
      title: 'Sync with human operator',
      description: 'Poll player://snapshot each turn before commenting on Tablero state.',
      argsSchema: {},
      render: () => {
        const steps = [
          'Stay aligned with the human operator running the Tablero in the browser.',
          '',
          'Workflow (repeat every turn before stating Tablero facts):',
          '1. Read player://snapshot OR call session_report / refresh_snapshot first.',
          '2. Compare your summary to what the operator sees: year, play/pause, deck phases.',
          '3. If snapshot.health.socket.connected is false, say the monitor is offline — do not invent deck state.',
          '4. When proposing playhead moves, prefer goto_parte / goto_year and confirm via session_report.',
          '5. Prefer short factual updates; ask the operator to confirm ambiguous states.'
        ];
        return promptMessages(steps.join('\n'));
      }
    },
    {
      name: 'pinch-session',
      title: 'Pinch session with operator',
      description:
        'Collaborative DJ workflow: session_report, bootstrap if needed, goto_parte/anchor/year, confirm without Playwright.',
      argsSchema: {},
      render: () => {
        const steps = [
          'Pinch a Tablero ALEPH session together with the human operator — no Playwright.',
          '',
          'Workflow:',
          '1. Call session_report (or read player://snapshot) before stating any Tablero facts.',
          '2. If decks A/B are empty or not resolved, call bootstrap_decks.',
          '3. To navigate: goto_parte (I–IV), goto_anchor (P01–P24), or goto_year.',
          '4. To change crossover caso/VU meters for the operator: select_caso.',
          '5. After each action, call session_report again and compare with what the operator sees.',
          '6. Use wait_for_session when you need to block until year/nodo/phase matches.',
          '7. For wikitext gaps on deck B, use ensure_wikitext instead of manual cache+poll.',
          '8. Low-level socket tools (set_playhead, deck_load, …) remain available from logic.mjs when needed.',
          '9. Never invent state if health.socket.connected is false.'
        ];
        return promptMessages(steps.join('\n'));
      }
    }
  ];
}

function buildMcpServer(stateStore, config, substrate) {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const registry = getResourceRegistry(stateStore, config, substrate.poller);
  const templateRegistry = getTemplateRegistry(stateStore, config, substrate.poller);
  const promptRegistry = getPromptRegistry(config);

  logic.buildMcp(server, {
    client: substrate.client,
    poller: substrate.poller,
    stateStore
  });

  logicSession.buildMcp(server, {
    client: substrate.client,
    poller: substrate.poller,
    stateStore
  });

  registerCommonMCP(server, {
    serverName: SERVER_NAME,
    registry,
    templateRegistry,
    promptRegistry
  });

  updateServerCard(registry, server, {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    port: config.mcpPort
  });

  return { server };
}

/**
 * @param {ReturnType<import('./state-store.mjs').createStateStore>} stateStore
 * @param {ReturnType<typeof getDebugConfig>} config
 * @param {{ client: object, poller: object }} substrate
 */
export function createServer(stateStore, config, substrate) {
  const { server: mcpServer } = buildMcpServer(stateStore, config, substrate);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/mcp/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      server: SERVER_NAME,
      name: SERVER_NAME,
      version: SERVER_VERSION,
      playerUiUrl: config.baseUrl,
      capabilities: getMcpCapabilities(mcpServer)
    });
  });

  mountMCPRoute(app, { mcpServer, logLabel: SERVER_NAME });

  const start = createMcpHttpStart(app, { name: SERVER_NAME, port: config.mcpPort, mcpServer });

  return { name: SERVER_NAME, port: config.mcpPort, app, start };
}
