/**
 * ALEPH et OMEGA static data bridge for Tablero player-ui.
 * Reads manifest, wave-A anchors, medidor estado.json — no MCP fetch.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { resolveLineasSourceRoot } from '@zeus/presets-sdk';
import { packageDir } from './config.mjs';

const ZEUS_ROOT = path.resolve(packageDir, '../..');
const NETWORK_ENGINE = path.resolve(ZEUS_ROOT, '..');
const SCRIPTORIUM_ROOT = path.resolve(NETWORK_ENGINE, '..');

function lineasSourceRoot() {
  return resolveLineasSourceRoot();
}

const DEFAULT_PATHS = {
  get manifest() {
    return path.join(lineasSourceRoot(), 'espana/manifest.json');
  },
  get waveAAnchors() {
    return path.join(lineasSourceRoot(), 'scripts/fetch-priority-viaje1.json');
  },
  medidorCasos: path.join(SCRIPTORIUM_ROOT, 'medidor-poder-politico/data/casos'),
  prensaBase: '/prensa/caso'
};

const DEFAULT_LINEA_SERVERS = {
  espana: { tronco: 'linea-espana', satelite: 'linea-wp-historia' }
};

const STUB_BYTE_THRESHOLD = 100;

/** @type {Map<string, object>} */
const manifestCacheByLinea = new Map();
/** @type {Map<string, object[]>} */
const anchorsCacheByLinea = new Map();
let registryCache = null;

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

/**
 * @param {object} [paths] - override paths from config.aleph.paths
 */
export function resolveAlephPaths(paths = {}) {
  return { ...DEFAULT_PATHS, ...paths };
}

export function loadLineaRegistry() {
  if (registryCache) return registryCache;
  const registryPath = path.join(lineasSourceRoot(), 'registry.yaml');
  if (!fs.existsSync(registryPath)) {
    return { error: `file not found: ${registryPath}` };
  }
  try {
    const raw = yaml.parse(fs.readFileSync(registryPath, 'utf8'));
    const lineas = Array.isArray(raw) ? raw : [];
    registryCache = {
      lineas: lineas.map((entry) => ({
        id: entry.id,
        path: entry.path,
        etiqueta: entry.etiqueta,
        nodo_prefix: entry.nodo_prefix || 'P',
        nodo_count: entry.nodo_count ?? 24,
        referencia_wp_cima: entry.referencia_wp_cima ?? null
      }))
    };
    return registryCache;
  } catch (err) {
    return { error: err.message };
  }
}

export function findLineaEntry(lineaId) {
  const registry = loadLineaRegistry();
  if (registry.error) return registry;
  const entry = registry.lineas.find((l) => l.id === lineaId);
  if (!entry) return { error: `unknown linea "${lineaId}"` };
  return entry;
}

/**
 * @param {string} lineaId
 * @param {object} [entry]
 */
export function resolveLineaPaths(lineaId, entry = null) {
  const linea = entry || findLineaEntry(lineaId);
  if (linea.error) return linea;
  const lineaDir = path.join(lineasSourceRoot(), linea.path);
  return {
    lineaId: linea.id,
    manifest: path.join(lineaDir, 'manifest.json'),
    waveAAnchors: path.join(lineaDir, 'wave-a-anchors.json'),
    globalWaveAAnchors: path.join(lineasSourceRoot(), 'scripts/fetch-priority-viaje1.json')
  };
}

function buildNodoIdSet(prefix, count) {
  const ids = new Set();
  for (let i = 1; i <= count; i++) {
    ids.add(`${prefix}${String(i).padStart(2, '0')}`);
  }
  return ids;
}

export function loadManifestForLinea(lineaId = 'espana', paths = {}) {
  if (manifestCacheByLinea.has(lineaId)) {
    return manifestCacheByLinea.get(lineaId);
  }
  const lineaPaths = resolveLineaPaths(lineaId);
  if (lineaPaths.error) return lineaPaths;
  const manifestPath = paths.manifest || lineaPaths.manifest;
  const data = readJson(manifestPath);
  if (!data.error) manifestCacheByLinea.set(lineaId, data);
  return data;
}

export function loadWaveAAnchorsForLinea(lineaId = 'espana', paths = {}) {
  if (anchorsCacheByLinea.has(lineaId)) {
    return anchorsCacheByLinea.get(lineaId);
  }
  const entry = findLineaEntry(lineaId);
  if (entry.error) return entry;
  const lineaPaths = resolveLineaPaths(lineaId, entry);
  const perLineaPath = paths.waveAAnchors || lineaPaths.waveAAnchors;
  let raw = readJson(perLineaPath);
  if (raw.error || !Array.isArray(raw) || raw.length === 0) {
    raw = readJson(paths.globalWaveAAnchors || lineaPaths.globalWaveAAnchors);
  }
  if (raw.error) return raw;
  const allowedIds = buildNodoIdSet(entry.nodo_prefix, entry.nodo_count);
  const anchors = Array.isArray(raw)
    ? raw.filter((e) => e.tier === 'nodo-anchor' && e.nodo_id && allowedIds.has(e.nodo_id))
    : [];
  anchorsCacheByLinea.set(lineaId, anchors);
  return anchors;
}

/** @deprecated use loadManifestForLinea */
export function loadManifest(paths = {}) {
  return loadManifestForLinea('espana', paths);
}

/** @deprecated use loadWaveAAnchorsForLinea */
export function loadWaveAAnchors(paths = {}) {
  return loadWaveAAnchorsForLinea('espana', paths);
}

export function loadMedicion(casoId, paths = {}) {
  const base = resolveAlephPaths(paths).medidorCasos;
  const estadoPath = path.join(base, casoId, 'estado.json');
  const data = readJson(estadoPath);
  if (data.error) return { casoId, error: data.error };

  const mediciones = data.mediciones || {};
  const timeline = Object.entries(mediciones).map(([key, m]) => ({
    key,
    id: m.id,
    intensidad: m.intensidad,
    ejes: m.ejes,
    lectura: m.lectura,
    buffers_activos: m.buffers_activos
  }));

  const lastKey = Object.keys(mediciones).filter(k => k.startsWith('post_mcs_')).sort().pop();
  const latest = lastKey ? mediciones[lastKey] : mediciones.baseline;

  return {
    caso_id: data.caso_id || casoId,
    linea_id: data.linea_id,
    caso_foco: data.caso_foco,
    mediciones,
    timeline,
    latest: latest ? { key: lastKey || 'baseline', ...latest } : null
  };
}

function parseAnchorYear(note) {
  if (!note || typeof note !== 'string') return null;
  const match = note.match(/WP\s+(\d{4})/);
  return match ? Number(match[1]) : null;
}

/**
 * @param {number[]} cachedOldids
 * @param {Map<number, number>} [wikitextLengths]
 * @param {object} [options] - { lineaId?, paths? }
 */
export function buildAnchorGrid(cachedOldids = [], wikitextLengths = null, options = {}) {
  const opts = options?.lineaId != null || options?.paths != null
    ? options
    : { lineaId: 'espana', paths: options };
  const lineaId = opts.lineaId || 'espana';
  const paths = opts.paths || {};

  const lineaEntry = findLineaEntry(lineaId);
  if (lineaEntry.error) return { error: lineaEntry.error };

  const manifest = loadManifestForLinea(lineaId, paths);
  const anchors = loadWaveAAnchorsForLinea(lineaId, paths);
  if (manifest.error) return { error: manifest.error };
  if (anchors.error) return { error: anchors.error };

  const cachedSet = new Set(cachedOldids.map(Number));
  const nodosById = Object.fromEntries((manifest.nodos || []).map(n => [n.id, n]));

  const cells = anchors.map(anchor => {
    const oid = Number(anchor.oldid);
    const nodo = nodosById[anchor.nodo_id] || {};
    let status = 'missing';
    if (cachedSet.has(oid)) {
      const len = wikitextLengths?.get(oid);
      status = len != null && len < STUB_BYTE_THRESHOLD ? 'stub' : 'cached';
    }
    return {
      nodo_id: anchor.nodo_id,
      oldid: oid,
      year: nodo.año_ini ?? null,
      wp_year: parseAnchorYear(anchor.note),
      note: anchor.note,
      etiqueta: nodo.etiqueta ?? null,
      status
    };
  });

  const summary = {
    total: cells.length,
    cached: cells.filter(c => c.status === 'cached').length,
    stub: cells.filter(c => c.status === 'stub').length,
    missing: cells.filter(c => c.status === 'missing').length
  };

  return {
    linea: {
      id: lineaEntry.id,
      etiqueta: lineaEntry.etiqueta,
      nodo_prefix: lineaEntry.nodo_prefix,
      nodo_count: lineaEntry.nodo_count
    },
    cells,
    summary
  };
}

export function resolveLineaServers(config = {}, lineaId = 'espana') {
  const map = config.aleph?.lineaServers || DEFAULT_LINEA_SERVERS;
  return map[lineaId] || DEFAULT_LINEA_SERVERS[lineaId] || null;
}

import { normalizeSatRel } from '@zeus/presets-sdk';

const DEFAULT_SATELITE_WP = 'wp/historia';

export function getSateliteWp(lineaId = 'espana', paths = {}) {
  const manifest = loadManifestForLinea(lineaId, paths);
  if (manifest.error) return DEFAULT_SATELITE_WP;
  return normalizeSatRel(manifest.meta?.satelite_wp);
}

export function getAlephConfig(config = {}) {
  const aleph = config.aleph || {};
  const paths = resolveAlephPaths(aleph.paths);
  const defaultLinea = aleph.defaultLinea || 'espana';
  return {
    defaultPresets: aleph.defaultPresets || { A: 'aleph-tronco-puro', B: 'aleph-wp-cache' },
    defaultCaso: aleph.defaultCaso || 'aeo-p24-linea',
    defaultLinea,
    satelite_wp: getSateliteWp(defaultLinea, paths),
    casos: aleph.casos || ['aeo-p24-linea', 'aeo-tronco-caso1', 'aeo-caso2-2026'],
    theme: aleph.theme || 'Scriptorium-Skins',
    branding: aleph.branding || {
      title: 'Tablero ALEPH',
      tag: 'Animus Iocandi · Scriptorium Skins'
    },
    lineaServers: aleph.lineaServers || DEFAULT_LINEA_SERVERS,
    view: {
      host: config.view?.host || 'localhost',
      port: config.view?.port || 3015,
      path: '/'
    },
    prensa: {
      baseUrl: aleph.prensaBaseUrl || 'http://localhost:8080/prensa/caso',
      publicaciones: aleph.prensaLinks || [
        { slug: 'block0-aleph-et-omega', label: 'Artículo block-0', caso: 'aeo-p24-linea' },
        { slug: 'reader-sintesis-p24-composer', label: 'Síntesis P24 reader', caso: 'aeo-p24-linea' },
        { slug: 'reader-sintesis-tronco-composer', label: 'Síntesis tronco reader', caso: 'aeo-tronco-caso1' },
        { slug: 'reader-sintesis-caso2-composer', label: 'Síntesis caso2 2026', caso: 'aeo-caso2-2026' }
      ]
    },
    paths,
    preguntas: aleph.preguntas || {
      'aeo-p24-linea': '¿Representación rota post-15M o presidencialismo en P24?',
      'aeo-tronco-caso1': '¿Cómo ha fluctuado el poder de P01 a P23?',
      'aeo-caso2-2026': '¿Qué pinta tiene el presente 2026?'
    }
  };
}

export function buildTopology(cards = {}) {
  return {
    nodes: [
      {
        id: 'linea-espana',
        port: 4111,
        role: 'tronco',
        coverage: '450–2026',
        card: cards.espana || null
      },
      {
        id: 'linea-wp-historia',
        port: 4112,
        role: 'satelite',
        coverage: '2001–2026',
        card: cards.wpHistoria || null
      },
      {
        id: 'lineas-poder',
        role: 'disco',
        path: 'network-engine/lineas-poder/espana/'
      },
      {
        id: 'fetch_batch',
        role: 'python-only',
        path: 'network-engine/lineas-poder/scripts/fetch_batch.py'
      }
    ],
    lanes: {
      composer: [
        'cache-status',
        'get_nodo(año)',
        'linea://wikitext/{oldid}',
        'medidor cribar/commit',
        'blockchain/block-N.md'
      ],
      reader: [
        'timeline-nodos',
        'report-nodo',
        'linea://cache/stats (lectura)',
        'readerchain'
      ]
    }
  };
}

export function clearAlephCache(lineaId = null) {
  if (lineaId) {
    manifestCacheByLinea.delete(lineaId);
    anchorsCacheByLinea.delete(lineaId);
    return;
  }
  manifestCacheByLinea.clear();
  anchorsCacheByLinea.clear();
  registryCache = null;
}
