import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk';
import { inspectSnapshotAt } from './snapshot-inspect.mjs';

/**
 * Registers player-ui-debug domain tools (socket proxy + snapshot refresh).
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {{ client: ReturnType<import('./client.mjs').createSessionClient>, poller: ReturnType<import('./rest-poller.mjs').createRestPoller>, stateStore: ReturnType<import('./state-store.mjs').createStateStore> }} ctx
 */
export function buildMcp(server, { client, poller, stateStore }) {
  server.registerTool(
    'set_playhead',
    {
      title: 'Set playhead year',
      description: 'Move the shared playhead on player-ui via playhead:set socket event.',
      inputSchema: {
        year: z.number().describe('Historical year (fraction allowed).')
      }
    },
    async ({ year }) => {
      const ok = client.setPlayhead(year);
      return jsonContent({ ok, year, snapshot: ok ? stateStore.getSnapshot() : undefined });
    }
  );

  server.registerTool(
    'transport_play',
    {
      title: 'Start transport',
      description: 'Start playhead transport via transport:play socket event.',
      inputSchema: {}
    },
    async () => {
      const ok = client.playTransport();
      return jsonContent({ ok });
    }
  );

  server.registerTool(
    'transport_pause',
    {
      title: 'Pause transport',
      description: 'Pause playhead transport via transport:pause socket event.',
      inputSchema: {}
    },
    async () => {
      const ok = client.pauseTransport();
      return jsonContent({ ok });
    }
  );

  server.registerTool(
    'sync_toggle',
    {
      title: 'Toggle deck sync',
      description: 'Toggle linked playhead between decks via sync:toggle socket event.',
      inputSchema: {}
    },
    async () => {
      const ok = client.toggleSync();
      return jsonContent({ ok });
    }
  );

  server.registerTool(
    'deck_load',
    {
      title: 'Load deck server',
      description: 'Load a catalog server (optional preset filter) onto deck A or B.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).describe('Deck id: A or B.'),
        serverName: z.string().describe('Catalog server name, e.g. linea-espana.'),
        presetId: z.string().optional().describe('Optional preset id to filter capabilities.')
      }
    },
    async ({ deckId, serverName, presetId }) => {
      const payload = presetId ? { deckId, serverName, presetId } : { deckId, serverName };
      const ok = client.deckLoad(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'registro_select',
    {
      title: 'Select registro on deck',
      description: 'Select a registro revision on a deck; re-resolves wikitext via registro:select.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (optional).'),
        oldid: z.number().describe('Wikipedia revision oldid.'),
        registro_id: z.string().optional().describe('Optional registro id.')
      }
    },
    async ({ deckId, oldid, registro_id }) => {
      const payload = registro_id ? { deckId, oldid, registro_id } : deckId ? { deckId, oldid } : { oldid };
      const ok = client.registroSelect(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'wikitext_cache',
    {
      title: 'Cache wikitext on deck',
      description: 'Call wikitext:cache on player-ui for a deck oldid when preset allows.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (optional).'),
        oldid: z.number().describe('Wikipedia revision oldid to cache.')
      }
    },
    async ({ deckId, oldid }) => {
      const payload = deckId ? { deckId, oldid } : { oldid };
      const ok = client.wikitextCache(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'wikitext_poll',
    {
      title: 'Poll wikitext cache',
      description: 'Poll wikitext cache via wikitext:poll; auto-selects when cached.',
      inputSchema: {
        deckId: z.enum(['A', 'B']).optional().describe('Deck id (optional).'),
        oldid: z.number().describe('Wikipedia revision oldid to poll.')
      }
    },
    async ({ deckId, oldid }) => {
      const payload = deckId ? { deckId, oldid } : { oldid };
      const ok = client.wikitextPoll(payload);
      return jsonContent({ ok, ...payload });
    }
  );

  server.registerTool(
    'refresh_snapshot',
    {
      title: 'Refresh monitor snapshot',
      description: 'Force REST poll and return the current player://snapshot composite.',
      inputSchema: {}
    },
    async () => {
      await poller.pollOnce();
      return jsonContent(stateStore.getSnapshot());
    }
  );

  server.registerTool(
    'session_inspect',
    {
      title: 'Inspect snapshot path',
      description:
        'Navigate player://snapshot by path — returns value, children, parent, and sibling paths.',
      inputSchema: {
        path: z.string().optional().describe('Dot path, e.g. decks.B.resolved or session.decks.A.')
      }
    },
    async ({ path }) => jsonContent(inspectSnapshotAt(stateStore, path || 'session'))
  );
}
