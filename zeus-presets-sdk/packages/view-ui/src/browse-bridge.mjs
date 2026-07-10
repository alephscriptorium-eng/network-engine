/**
 * Filesystem browse bridge for view-ui.
 * Resolves line roots from registry.yaml; read-only directory and file access.
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { loadLineaData, DEFAULT_BASE_PATH } from '@zeus/linea-system/loader';
import { sanitizeRelativePath as sanitizePathCore } from '@zeus/presets-sdk/browse-core';
import { buildAnchorGrid } from '@zeus/presets-sdk/anchor-grid';
import { wikitextPath as buildWikitextRelPath, DEFAULT_SATELITE_WP, normalizeSatRel } from '@zeus/presets-sdk';
import { getViewersConfig } from './config.mjs';

const ANCHOR_INDEX_NAMES = new Set(['fetch-priority-viaje1.json', 'wave-a-anchors.json']);

/** @type {object|null} */
let lineaDataCache = null;
/** @type {string|null} */
let cachedBasePath = null;

/**
 * @param {string} relPath
 */
export function sanitizeRelativePath(relPath) {
  try {
    const safePath = sanitizePathCore(relPath);
    return { path: safePath };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * @param {string} basePath
 */
export async function ensureLineaData(basePath = DEFAULT_BASE_PATH) {
  if (lineaDataCache && cachedBasePath === basePath) {
    return lineaDataCache;
  }
  try {
    lineaDataCache = await loadLineaData(basePath);
    cachedBasePath = basePath;
    return lineaDataCache;
  } catch (err) {
    return { error: err.message, basePath };
  }
}

export function clearLineaDataCache() {
  lineaDataCache = null;
  cachedBasePath = null;
}

/**
 * @param {object} data
 * @param {string} lineaId
 */
export function getLineaInstance(data, lineaId) {
  if (data.error) return data;
  const line = data.lineas?.[lineaId];
  if (!line) return { error: `unknown linea "${lineaId}"` };
  return line;
}

/**
 * @param {object} line
 * @param {string} relPath
 */
export function resolveLineFilePath(line, relPath) {
  const sanitized = sanitizeRelativePath(relPath);
  if (sanitized.error) return sanitized;
  const sourceLineRoot = path.resolve(line.linePath);
  const abs = path.join(sourceLineRoot, sanitized.path || '.');
  if (!abs.startsWith(sourceLineRoot + path.sep) && abs !== sourceLineRoot) {
    return { error: 'path outside line root' };
  }
  return { absPath: abs, relPath: sanitized.path };
}

/**
 * @param {string} basePath
 */
export async function listLineas(basePath) {
  const data = await ensureLineaData(basePath);
  if (data.error) return data;
  const lineas = (data.registry || []).map((entry) => {
    const inst = data.lineas[entry.id];
    return {
      id: entry.id,
      path: entry.path,
      etiqueta: entry.etiqueta,
      nodo_prefix: entry.nodo_prefix || 'P',
      nodo_count: entry.nodo_count ?? 24,
      lineRoot: inst?.linePath ?? path.join(basePath, entry.path),
      hasSatellite: Boolean(inst?.satellite)
    };
  });
  return { basePath: data.basePath, lineas };
}

/**
 * @param {object} handlers
 * @param {string} fileName
 */
export function resolveViewer(handlers, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const basename = path.basename(fileName);
  for (const rule of handlers) {
    if (rule.match === 'basename' && rule.value === basename) return rule.viewer;
    if (rule.match === 'ext' && rule.value === ext) return rule.viewer;
    if (rule.match === 'fallback') return rule.viewer;
  }
  return 'text-plain';
}

/**
 * @param {string} fileName
 */
export function resolveFileKind(fileName, viewer) {
  if (viewer === 'anchors-explorer') return 'anchors-index';
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.md') return 'markdown';
  if (ext === '.wikitext') return 'wikitext';
  return 'text';
}

/**
 * @param {string} basePath
 * @param {string} lineaId
 * @param {string} relPath
 * @param {object} [options]
 */
export async function browseDirectory(basePath, lineaId, relPath = '', options = {}) {
  const data = await ensureLineaData(basePath);
  if (data.error) return data;
  const line = getLineaInstance(data, lineaId);
  if (line.error) return line;

  const resolved = resolveLineFilePath(line, relPath);
  if (resolved.error) return resolved;

  const offset = Math.max(0, Number(options.offset) || 0);
  const limit = Math.min(500, Math.max(1, Number(options.limit) || 200));

  try {
    const stat = await fs.stat(resolved.absPath);
    if (!stat.isDirectory()) {
      return { error: 'not a directory', path: resolved.relPath };
    }

    const entries = await fs.readdir(resolved.absPath, { withFileTypes: true });
    const handlers = options.handlers || getViewersConfig().handlers;

    const mapped = await Promise.all(
      entries.map(async (entry) => {
        const childRel = resolved.relPath
          ? `${resolved.relPath}/${entry.name}`
          : entry.name;
        let size = null;
        if (entry.isFile()) {
          try {
            const fstat = await fs.stat(path.join(resolved.absPath, entry.name));
            size = fstat.size;
          } catch {
            size = null;
          }
        }
        return {
          name: entry.name,
          path: childRel,
          type: entry.isDirectory() ? 'directory' : 'file',
          ext: entry.isFile() ? path.extname(entry.name).toLowerCase() : null,
          size,
          viewer: entry.isFile() ? resolveViewer(handlers, entry.name) : null
        };
      })
    );

    mapped.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    const total = mapped.length;
    const page = mapped.slice(offset, offset + limit);

    return {
      linea: lineaId,
      path: resolved.relPath,
      entries: page,
      pagination: { total, offset, limit, hasMore: offset + limit < total }
    };
  } catch (err) {
    return { error: err.message, path: resolved.relPath };
  }
}

/**
 * @param {string} basePath
 * @param {string} lineaId
 * @param {string} relPath
 * @param {object} [options]
 */
export async function readLineFile(basePath, lineaId, relPath, options = {}) {
  const data = await ensureLineaData(basePath);
  if (data.error) return data;
  const line = getLineaInstance(data, lineaId);
  if (line.error) return line;

  const resolved = resolveLineFilePath(line, relPath);
  if (resolved.error) return resolved;

  const handlers = options.handlers || getViewersConfig().handlers;
  const fileName = path.basename(resolved.absPath);

  try {
    const stat = await fs.stat(resolved.absPath);
    if (!stat.isFile()) {
      return { error: 'not a file', path: resolved.relPath };
    }

    const viewer = resolveViewer(handlers, fileName);
    const kind = resolveFileKind(fileName, viewer);
    const raw = await fs.readFile(resolved.absPath, 'utf8');

    let payload = raw;
    if (kind === 'json' || kind === 'anchors-index') {
      try {
        payload = JSON.parse(raw);
      } catch (err) {
        return { error: `invalid JSON: ${err.message}`, path: resolved.relPath };
      }
    }

    let meta = null;
    if (kind === 'wikitext') {
      const metaPath = resolved.absPath.replace(/\.wikitext$/, '.meta.json');
      if (fsSync.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fsSync.readFileSync(metaPath, 'utf8'));
        } catch {
          meta = null;
        }
      }
    }

    if (kind === 'markdown' && fileName === 'registro.md') {
      const dirName = path.basename(path.dirname(resolved.absPath));
      const oldidMatch = dirName.match(/oldid-(\d+)/);
      if (oldidMatch) {
        const oldid = Number(oldidMatch[1]);
        const satRel = normalizeSatRel(line.manifest?.meta?.satelite_wp);
        meta = {
          ...(meta || {}),
          oldid,
          registroDir: dirName,
          wikitextPath: buildWikitextRelPath(satRel, oldid)
        };
      }
    }

    return {
      linea: lineaId,
      path: resolved.relPath,
      name: fileName,
      ext: path.extname(fileName).toLowerCase(),
      viewer,
      kind,
      size: stat.size,
      data: payload,
      meta
    };
  } catch (err) {
    return { error: err.message, path: resolved.relPath };
  }
}

/**
 * @param {string} basePath
 * @param {string} lineaId
 */
export async function getCacheStats(basePath, lineaId) {
  const data = await ensureLineaData(basePath);
  if (data.error) return data;
  const line = getLineaInstance(data, lineaId);
  if (line.error) return line;
  if (!line.satellite?.cacheStats) {
    return { error: 'no satellite cache data for this linea' };
  }
  return {
    linea: lineaId,
    source: 'filesystem',
    stats: line.satellite.cacheStats
  };
}

/**
 * Build Wave A anchor grid from filesystem cache state.
 * @param {string} basePath
 * @param {string} lineaId
 */
export async function buildAnchorsGrid(basePath, lineaId) {
  const data = await ensureLineaData(basePath);
  if (data.error) return data;
  const line = getLineaInstance(data, lineaId);
  if (line.error) return line;

  const cachedOldids = line.satellite?.cacheStats?.cached_oldids || [];
  const cacheDir = line.satellite
    ? path.join(line.satellite.satDir, 'cache/snapshots')
    : null;

  return buildAnchorGrid({
    lineaId,
    basePath: data.basePath,
    cachedOldids,
    lineaEntry: line.entry,
    manifest: line.manifest,
    cacheDir,
    includeWikitextPath: true
  });
}

/**
 * @param {string} basePath
 * @param {string} lineaId
 * @param {string} oldid
 */
export function resolveWikitextPath(basePath, lineaId, oldid) {
  const data = lineaDataCache;
  if (!data?.lineas?.[lineaId]) return { error: 'linea not loaded' };
  const line = data.lineas[lineaId];
  const satRel = normalizeSatRel(line.manifest?.meta?.satelite_wp);
  return {
    path: buildWikitextRelPath(satRel, oldid),
    oldid: Number(oldid)
  };
}

export function isAnchorIndexFile(fileName) {
  return ANCHOR_INDEX_NAMES.has(fileName);
}
