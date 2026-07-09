/**
 * Firehose deck resolution for Plato C (in-process DISK_01 reads).
 */

import { corpusRelPath } from '@zeus/presets-sdk';
import {
  browseCorpus,
  listPosts,
  getFirehoseStats,
  loadTriageManifest,
  loadPostFile
} from '@zeus/linea-firehose';

export const FIREHOSE_SERVER_NAME = 'firehose-mcp-server';

/**
 * @param {object|null|undefined} deck
 */
export function isFirehoseDeck(deck) {
  return deck?.serverName === FIREHOSE_SERVER_NAME;
}

async function pickDefaultBatchPath(corpus) {
  if (corpus === 'labeled' || corpus === 'discarded') {
    return '';
  }
  const root = await browseCorpus(corpus, '', { limit: 20, offset: 0 });
  const batch = root.entries.find((e) => e.type === 'directory');
  return batch?.path || batch?.name || '';
}

/**
 * @param {object} opts
 * @param {string} [opts.corpus]
 * @param {string} [opts.path]
 * @param {string|null} [opts.selectedFilePath]
 * @param {number} [opts.limit]
 */
export async function resolveFirehoseDeck({
  corpus = 'candidate',
  path = '',
  selectedFilePath = null,
  limit = 25
} = {}) {
  const stats = getFirehoseStats();
  const corpusStats = stats.totals?.[corpus] ?? 0;

  let triage = null;
  try {
    triage = await loadTriageManifest();
  } catch {
    triage = null;
  }

  let batchPath = path;
  if (!batchPath && corpusStats > 0) {
    batchPath = await pickDefaultBatchPath(corpus);
  }

  /** @type {{ items: object[], pagination: object, empty: boolean }} */
  let posts = { items: [], pagination: {}, empty: true };
  if (corpusStats > 0) {
    const list = await listPosts(corpus, batchPath, {
      recursive: corpus === 'discarded',
      limit,
      offset: 0
    });
    posts = {
      items: list.posts || [],
      pagination: list.pagination || {},
      empty: Boolean(list.empty)
    };
  }

  let selected = null;
  if (selectedFilePath) {
    selected = posts.items.find((p) => p.filePath === selectedFilePath) || null;
    if (!selected) {
      try {
        const rel = corpusRelPath(corpus, selectedFilePath);
        const loaded = await loadPostFile(rel);
        selected = { ...loaded.post, filePath: selectedFilePath };
      } catch {
        selected = null;
      }
    }
  } else if (posts.items.length > 0) {
    selected = posts.items[0];
  }

  return buildFirehoseResolved({
    corpus,
    path: batchPath,
    stats,
    posts,
    selected,
    triage
  });
}

export function buildFirehoseResolved({ corpus, path, stats, posts, selected, triage }) {
  return {
    kind: 'firehose',
    corpus,
    path,
    stats,
    posts,
    selected,
    triage: triage
      ? {
          timestamp: triage.timestamp ?? null,
          source: triage.source ?? null,
          results: triage.results ?? null
        }
      : null
  };
}
