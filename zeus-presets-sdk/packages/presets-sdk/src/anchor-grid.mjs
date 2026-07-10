/**
 * Unified Wave A anchor grid builder (cached | stub | missing).
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { resolveLineasBasePath } from './lineas-paths.mjs';
import { wikitextPath as buildWikitextRelPath, normalizeSatRel } from './view-paths.mjs';

export const STUB_BYTE_THRESHOLD = 100;

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return { error: `file not found: ${filePath}` };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return { error: err.message };
  }
}

function buildNodoIdSet(prefix, count) {
  const ids = new Set();
  for (let i = 1; i <= count; i++) {
    ids.add(`${prefix}${String(i).padStart(2, '0')}`);
  }
  return ids;
}

function parseAnchorYear(note) {
  if (!note || typeof note !== 'string') return null;
  const match = note.match(/WP\s+(\d{4})/);
  return match ? Number(match[1]) : null;
}

function loadRegistry(basePath) {
  const registryPath = path.join(basePath, 'registry.yaml');
  if (!fs.existsSync(registryPath)) {
    return { error: `file not found: ${registryPath}` };
  }
  try {
    const raw = yaml.parse(fs.readFileSync(registryPath, 'utf8'));
    const lineas = Array.isArray(raw) ? raw : [];
    return {
      lineas: lineas.map((entry) => ({
        id: entry.id,
        path: entry.path,
        etiqueta: entry.etiqueta,
        nodo_prefix: entry.nodo_prefix || 'P',
        nodo_count: entry.nodo_count ?? 24,
        referencia_wp_cima: entry.referencia_wp_cima ?? null
      }))
    };
  } catch (err) {
    return { error: err.message };
  }
}

function findLineaEntry(basePath, lineaId) {
  const registry = loadRegistry(basePath);
  if (registry.error) return registry;
  const entry = registry.lineas.find((l) => l.id === lineaId);
  if (!entry) return { error: `unknown linea "${lineaId}"` };
  return entry;
}

function resolveAnchorPaths(basePath, entry) {
  const lineaDir = path.join(basePath, entry.path);
  return {
    manifest: path.join(lineaDir, 'manifest.json'),
    waveAAnchors: path.join(lineaDir, 'wave-a-anchors.json'),
    globalWaveAAnchors: path.join(basePath, 'scripts/fetch-priority-viaje1.json')
  };
}

function loadManifest(basePath, lineaId, paths = {}) {
  const entry = findLineaEntry(basePath, lineaId);
  if (entry.error) return entry;
  const lineaPaths = resolveAnchorPaths(basePath, entry);
  return readJson(paths.manifest || lineaPaths.manifest);
}

function loadAnchors(basePath, lineaId, paths = {}) {
  const entry = findLineaEntry(basePath, lineaId);
  if (entry.error) return entry;
  const lineaPaths = resolveAnchorPaths(basePath, entry);
  let raw = readJson(paths.waveAAnchors || lineaPaths.waveAAnchors);
  if (raw.error || !Array.isArray(raw) || raw.length === 0) {
    raw = readJson(paths.globalWaveAAnchors || lineaPaths.globalWaveAAnchors);
  }
  if (raw.error) return raw;
  const allowedIds = buildNodoIdSet(entry.nodo_prefix, entry.nodo_count);
  return Array.isArray(raw)
    ? raw.filter((e) => e.tier === 'nodo-anchor' && e.nodo_id && allowedIds.has(e.nodo_id))
    : [];
}

function buildCells(anchors, manifest, cachedOldids, wikitextLengths, includeWikitextPath) {
  const cachedSet = new Set((cachedOldids || []).map(Number));
  const nodosById = Object.fromEntries((manifest.nodos || []).map((n) => [n.id, n]));
  const lengths = wikitextLengths instanceof Map ? wikitextLengths : null;
  const satRel = includeWikitextPath ? normalizeSatRel(manifest.meta?.satelite_wp) : null;

  return anchors.map((anchor) => {
    const oid = Number(anchor.oldid);
    const nodo = nodosById[anchor.nodo_id] || {};
    let status = 'missing';
    if (cachedSet.has(oid)) {
      const len = lengths?.get(oid);
      status = len != null && len < STUB_BYTE_THRESHOLD ? 'stub' : 'cached';
    }
    const cell = {
      nodo_id: anchor.nodo_id,
      oldid: oid,
      year: nodo.año_ini ?? null,
      wp_year: parseAnchorYear(anchor.note),
      note: anchor.note,
      etiqueta: nodo.etiqueta ?? null,
      status
    };
    if (satRel != null) {
      cell.wikitextPath = buildWikitextRelPath(satRel, oid);
    }
    return cell;
  });
}

function summarizeCells(cells) {
  return {
    total: cells.length,
    cached: cells.filter((c) => c.status === 'cached').length,
    stub: cells.filter((c) => c.status === 'stub').length,
    missing: cells.filter((c) => c.status === 'missing').length
  };
}

function resolveWikitextLengths(cachedOldids, wikitextLengths, cacheDir) {
  if (wikitextLengths instanceof Map) return wikitextLengths;
  if (!cacheDir || !cachedOldids?.length) return null;

  const lengths = new Map();
  for (const oid of cachedOldids) {
    const wtPath = path.join(cacheDir, `${oid}.wikitext`);
    if (fs.existsSync(wtPath)) {
      try {
        lengths.set(Number(oid), fs.statSync(wtPath).size);
      } catch {
        // skip
      }
    }
  }
  return lengths;
}

/**
 * Build Wave A anchor grid.
 *
 * `buildAnchorGrid({ lineaId, cachedOldids, wikitextLengths, paths, basePath, cacheDir, includeWikitextPath })`
 */
export function buildAnchorGrid(opts = {}) {
  const {
    lineaId = 'espana',
    cachedOldids = [],
    paths = {},
    basePath = resolveLineasBasePath(),
    cacheDir = null,
    includeWikitextPath = Boolean(cacheDir),
    lineaEntry: presetEntry = null,
    manifest: presetManifest = null,
    anchors: presetAnchors = null
  } = opts;

  const lineaEntry = presetEntry || findLineaEntry(basePath, lineaId);
  if (lineaEntry.error) return { error: lineaEntry.error };

  const manifest = presetManifest || loadManifest(basePath, lineaId, paths);
  if (manifest.error) return { error: manifest.error };

  const anchors = presetAnchors || loadAnchors(basePath, lineaId, paths);
  if (anchors.error) return { error: anchors.error };

  const lengths = resolveWikitextLengths(cachedOldids, opts.wikitextLengths, cacheDir);
  const cells = buildCells(anchors, manifest, cachedOldids, lengths, includeWikitextPath);

  return {
    linea: {
      id: lineaEntry.id,
      etiqueta: lineaEntry.etiqueta,
      nodo_prefix: lineaEntry.nodo_prefix,
      nodo_count: lineaEntry.nodo_count
    },
    cells,
    summary: summarizeCells(cells)
  };
}
