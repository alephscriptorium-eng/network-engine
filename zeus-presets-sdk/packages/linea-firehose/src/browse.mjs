/**
 * Corpus browse and micropost aggregation for the firehose volume.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  resolveVolume,
  browseVolume,
  readVolumeFile,
  corpusRelPath
} from '@zeus/presets-sdk';
import { normalizeFirehosePost, isJetstreamPost } from './schema.mjs';

/**
 * @param {string} corpusId
 */
export function getCorpusConfig(corpusId) {
  const volume = resolveVolume('firehose');
  const corpus = volume.corpora.find((c) => c.id === corpusId);
  if (!corpus) {
    throw new Error(`Unknown corpus: ${corpusId}`);
  }
  return { volume, corpus };
}

/**
 * @param {string} corpusId
 */
export function listCorpora() {
  const volume = resolveVolume('firehose');
  return volume.corpora.map((c) => ({
    id: c.id,
    label: c.label || c.id,
    path: c.path,
    files: c.files ?? null,
    empty: (c.files ?? 0) === 0
  }));
}

/**
 * Browse a corpus directory (lazy paginated).
 * @param {string} corpusId
 * @param {string} [relativePath='']
 * @param {{ limit?: number, offset?: number }} [options]
 */
export async function browseCorpus(corpusId, relativePath = '', options = {}) {
  const { corpus } = getCorpusConfig(corpusId);
  const volumePath = corpusRelPath(corpus.path, relativePath);
  const result = await browseVolume('firehose', volumePath, options);

  return {
    corpus: corpusId,
    corpusPath: corpus.path,
    path: relativePath,
    volumePath: result.path,
    absPath: result.absPath,
    entries: result.entries.map((e) => ({
      name: e.name,
      path: relativePath ? `${relativePath}/${e.name}` : e.name,
      type: e.type === 'dir' ? 'directory' : 'file',
      ext: e.ext ? `.${e.ext}` : null,
      size: e.size ?? null
    })),
    pagination: {
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      hasMore: result.hasMore
    }
  };
}

/**
 * Recursively collect JSON file paths under a directory.
 * @param {string} absDir
 * @param {string} relPrefix
 * @param {number} maxFiles
 */
async function collectJsonFiles(absDir, relPrefix, maxFiles) {
  const found = [];

  async function walk(dir, rel) {
    if (found.length >= maxFiles) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const entry of entries) {
      if (found.length >= maxFiles) break;
      const childAbs = path.join(dir, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(childAbs, childRel);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        found.push(childRel);
      }
    }
  }

  await walk(absDir, relPrefix);
  return found;
}

/**
 * List normalized microposts for preview.
 * @param {string} corpusId
 * @param {string} [relativePath='']
 * @param {{ recursive?: boolean, limit?: number, offset?: number }} [options]
 */
export async function listPosts(corpusId, relativePath = '', options = {}) {
  const { volume, corpus } = getCorpusConfig(corpusId);
  const recursive = options.recursive !== false;
  const limit = Math.min(500, Math.max(1, Number(options.limit) || 50));
  const offset = Math.max(0, Number(options.offset) || 0);

  if ((corpus.files ?? 0) === 0) {
    return {
      corpus: corpusId,
      path: relativePath,
      empty: true,
      posts: [],
      pagination: { total: 0, offset, limit, hasMore: false }
    };
  }

  const volumePath = corpusRelPath(corpus.path, relativePath);
  const absDir = path.join(volume.absPath, volumePath.replace(/\//g, path.sep));

  let relFiles = [];
  try {
    const stat = await fs.stat(absDir);
    if (stat.isFile() && absDir.endsWith('.json')) {
      relFiles = [relativePath];
    } else if (stat.isDirectory()) {
      if (recursive) {
        relFiles = await collectJsonFiles(absDir, relativePath, offset + limit + 200);
      } else {
        const browse = await browseCorpus(corpusId, relativePath, { limit: 500, offset: 0 });
        relFiles = browse.entries
          .filter((e) => e.type === 'file' && e.ext === '.json')
          .map((e) => e.path);
      }
    } else {
      throw new Error('Not a directory or JSON file');
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Path not found: ${relativePath || '/'}`);
    }
    throw err;
  }

  const page = relFiles.slice(offset, offset + limit);
  const posts = [];

  for (const relFile of page) {
    const fullPath = corpusRelPath(corpus.path, relFile);
    try {
      const file = await readVolumeFile('firehose', fullPath);
      const raw = JSON.parse(file.content);
      if (isJetstreamPost(raw)) {
        posts.push({
          ...normalizeFirehosePost(raw),
          filePath: relFile,
          fileSize: file.size
        });
      }
    } catch {
      // skip unreadable entries
    }
  }

  return {
    corpus: corpusId,
    path: relativePath,
    empty: posts.length === 0 && (corpus.files ?? 0) === 0,
    posts,
    pagination: {
      total: relFiles.length,
      offset,
      limit,
      hasMore: offset + limit < relFiles.length
    }
  };
}

/**
 * Volume-level stats from volumes.json corpora counts.
 */
export function getFirehoseStats() {
  const volume = resolveVolume('firehose');
  const corpora = listCorpora();
  const byId = Object.fromEntries(corpora.map((c) => [c.id, c.files ?? 0]));
  return {
    volumeId: volume.id,
    label: volume.label,
    absPath: volume.absPath,
    readonly: volume.readonly,
    corpora,
    totals: {
      candidate: byId.candidate ?? 0,
      raw: byId.raw ?? 0,
      discarded: byId.discarded ?? 0,
      labeled: byId.labeled ?? 0,
      all: Object.values(byId).reduce((a, b) => a + b, 0)
    },
    syncedAt: volume.source?.syncedAt || null
  };
}
