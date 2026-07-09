/**
 * Filesystem browse bridge for view-ui.
 * Resolves line roots from registry.yaml; read-only directory and file access.
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { loadLineaData, DEFAULT_BASE_PATH } from '@zeus/linea-system/src/loader.mjs';
import { wikitextPath as buildWikitextRelPath, DEFAULT_SATELITE_WP, normalizeSatRel, resolveLineasLineFilePath, isLineasCachePath } from '@zeus/presets-sdk';
import { getViewersConfig } from './config.mjs';

const ANCHOR_INDEX_NAMES = new Set(['fetch-priority-viaje1.json', 'wave-a-anchors.json']);
const STUB_BYTE_THRESHOLD = 100;

/** @type {object|null} */
let lineaDataCache = null;
/** @type {string|null} */
let cachedBasePath = null;

/**
 * @param {string} relPath
 */
export function sanitizeRelativePath(relPath) {
  const raw = relPath == null ? '' : String(relPath).trim().replace(/\\/g, '/');
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) {
    return { error: 'absolute paths not allowed' };
  }
  const segments = raw.split('/').filter((s) => s.length > 0);
  if (segments.some((s) => s === '..')) {
    return { error: 'path traversal not allowed' };
  }
  return { path: segments.join('/') };
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
  const abs = resolveLineasLineFilePath(line.linePath, sanitized.path || '.');
  if (!isLineasCachePath(sanitized.path || '')) {
    const sourceLineRoot = path.resolve(line.linePath);
    const underSource =
      abs.startsWith(sourceLineRoot + path.sep) || abs === sourceLineRoot;
    if (!underSource) {
      return { error: 'path outside line root' };
    }
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

function parseAnchorYear(note) {
  if (!note || typeof note !== 'string') return null;
  const match = note.match(/WP\s+(\d{4})/);
  return match ? Number(match[1]) : null;
}

function buildNodoIdSet(prefix, count) {
  const ids = new Set();
  for (let i = 1; i <= count; i++) {
    ids.add(`${prefix}${String(i).padStart(2, '0')}`);
  }
  return ids;
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

  const entry = line.entry;
  const manifest = line.manifest;
  const cachedOldids = line.satellite?.cacheStats?.cached_oldids || [];

  const lineaDir = line.linePath;
  const lineasRoot = data.basePath;
  const anchorPaths = [
    path.join(lineaDir, 'wave-a-anchors.json'),
    path.join(lineasRoot, 'scripts/fetch-priority-viaje1.json')
  ];

  let raw = null;
  for (const p of anchorPaths) {
    if (!fsSync.existsSync(p)) continue;
    try {
      const parsed = JSON.parse(fsSync.readFileSync(p, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        raw = parsed;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!raw) {
    return { error: 'no anchor index found for linea' };
  }

  const allowedIds = buildNodoIdSet(entry.nodo_prefix || 'P', entry.nodo_count ?? 24);
  const anchors = raw.filter((e) => e.tier === 'nodo-anchor' && e.nodo_id && allowedIds.has(e.nodo_id));

  const wikitextLengths = new Map();
  const cacheDir = line.satellite
    ? path.join(line.satellite.satDir, 'cache/snapshots')
    : null;
  if (cacheDir && fsSync.existsSync(cacheDir)) {
    for (const oid of cachedOldids) {
      const wtPath = path.join(cacheDir, `${oid}.wikitext`);
      if (fsSync.existsSync(wtPath)) {
        try {
          wikitextLengths.set(Number(oid), fsSync.statSync(wtPath).size);
        } catch {
          // skip
        }
      }
    }
  }

  const cachedSet = new Set(cachedOldids.map(Number));
  const nodosById = Object.fromEntries((manifest.nodos || []).map((n) => [n.id, n]));

  const cells = anchors.map((anchor) => {
    const oid = Number(anchor.oldid);
    const nodo = nodosById[anchor.nodo_id] || {};
    let status = 'missing';
    if (cachedSet.has(oid)) {
      const len = wikitextLengths.get(oid);
      status = len != null && len < STUB_BYTE_THRESHOLD ? 'stub' : 'cached';
    }
    const satRel = normalizeSatRel(manifest.meta?.satelite_wp);
    return {
      nodo_id: anchor.nodo_id,
      oldid: oid,
      year: nodo.año_ini ?? null,
      wp_year: parseAnchorYear(anchor.note),
      note: anchor.note,
      etiqueta: nodo.etiqueta ?? null,
      status,
      wikitextPath: buildWikitextRelPath(satRel, oid)
    };
  });

  const summary = {
    total: cells.length,
    cached: cells.filter((c) => c.status === 'cached').length,
    stub: cells.filter((c) => c.status === 'stub').length,
    missing: cells.filter((c) => c.status === 'missing').length
  };

  return {
    linea: {
      id: entry.id,
      etiqueta: entry.etiqueta,
      nodo_prefix: entry.nodo_prefix,
      nodo_count: entry.nodo_count
    },
    cells,
    summary
  };
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
