/**
 * MCP tools for the firehose volume (read-only disk corpus).
 */

import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { jsonContent, corpusRelPath, resolveVolume, TRIAGE_MANIFEST_PATH } from '@zeus/presets-sdk';
import {
  browseCorpus,
  listPosts,
  getFirehoseStats,
  listCorpora,
  getCorpusConfig
} from './browse.mjs';
import { loadPostFile } from './loader.mjs';

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function buildMcp(server) {
  server.registerTool(
    'firehose_browse',
    {
      title: 'Browse firehose corpus directory',
      description:
        'Lazy directory listing within a firehose corpus (candidate, raw, discarded, labeled). Returns entries with pagination.',
      inputSchema: {
        corpus: z.string().describe('Corpus id: candidate, raw, discarded, or labeled.'),
        path: z
          .string()
          .optional()
          .describe('Relative path within the corpus (e.g. batch timestamp dir). Empty for corpus root.'),
        limit: z.number().optional().describe('Page size (default 200, max 500).'),
        offset: z.number().optional().describe('Pagination offset (default 0).')
      }
    },
    async ({ corpus, path = '', limit, offset }) =>
      jsonContent(await browseCorpus(corpus, path, { limit, offset }))
  );

  server.registerTool(
    'firehose_list_posts',
    {
      title: 'List normalized microposts',
      description:
        'Returns Jetstream posts normalized for preview (handle, text, uri) from JSON files under a corpus path.',
      inputSchema: {
        corpus: z.string().describe('Corpus id.'),
        path: z.string().optional().describe('Relative directory or JSON file path within corpus.'),
        recursive: z.boolean().optional().describe('Recurse subdirectories (default true).'),
        limit: z.number().optional().describe('Max posts (default 50).'),
        offset: z.number().optional().describe('Offset (default 0).')
      }
    },
    async ({ corpus, path = '', recursive, limit, offset }) =>
      jsonContent(await listPosts(corpus, path, { recursive, limit, offset }))
  );

  server.registerTool(
    'firehose_get_post',
    {
      title: 'Read and normalize a single post file',
      description: 'Loads one JSON post by volume-relative path (e.g. candidate/batch/file.json).',
      inputSchema: {
        path: z
          .string()
          .describe('Path relative to FIREHOSE volume root, including corpus prefix.')
      }
    },
    async ({ path }) => jsonContent(await loadPostFile(path))
  );
}

export function getResourceRegistry() {
  return [
    {
      name: 'firehose-stats',
      uri: 'firehose://stats',
      title: 'Firehose volume stats',
      mimeType: 'application/json',
      description: 'Corpus file counts and volume metadata from VOLUMES/DISK_01/FIREHOSE.',
      read: () => getFirehoseStats()
    },
    {
      name: 'firehose-triage',
      uri: 'firehose://triage',
      title: 'Triage manifest',
      mimeType: 'application/json',
      description: 'Parsed triage-manifest.json at the firehose volume root.',
      read: () => {
        const volume = resolveVolume('firehose');
        const full = path.join(volume.absPath, TRIAGE_MANIFEST_PATH.replace(/\//g, path.sep));
        return JSON.parse(fs.readFileSync(full, 'utf8'));
      }
    }
  ];
}

export function getTemplateRegistry() {
  return [
    {
      name: 'firehose-corpus',
      uriTemplate: 'firehose://corpus/{corpusId}',
      title: 'Firehose corpus metadata',
      mimeType: 'application/json',
      description: 'Metadata for one corpus (id, label, path, files, empty flag).',
      read: (variables) => {
        const { corpus } = getCorpusConfig(variables.corpusId);
        const listed = listCorpora().find((c) => c.id === variables.corpusId);
        if (!listed) return { error: `Unknown corpus: ${variables.corpusId}` };
        return { ...listed, volumePath: corpus.path };
      }
    },
    {
      name: 'firehose-post',
      uriTemplate: 'firehose://post/{corpusId}/{batch}/{filename}',
      title: 'Normalized firehose post',
      mimeType: 'application/json',
      description:
        'Single post JSON normalized from candidate/raw batch layout (corpus/batch/filename.json).',
      read: async (variables) => {
        const rel = corpusRelPath(
          variables.corpusId,
          `${variables.batch}/${variables.filename}`
        );
        return loadPostFile(rel);
      }
    }
  ];
}

export function getPromptRegistry() {
  return [
    {
      name: 'explore-firehose',
      title: 'Explore firehose volume',
      description: 'Menu of read-only firehose corpus capabilities on DISK_01.',
      argsSchema: {},
      render: () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Explore the firehose ONFALO volume (DISK_01/FIREHOSE).',
                '',
                'Steps:',
                '1. Read firehose://stats for corpus counts.',
                '2. Read firehose://triage for triage manifest summary.',
                '3. Call firehose_browse with corpus "candidate" to list batch directories.',
                '4. Call firehose_list_posts on a batch path for micropost previews.',
                '5. Open Firehose Explorer UI at http://localhost:3016 for visual browse.'
              ].join('\n')
            }
          }
        ]
      })
    }
  ];
}
