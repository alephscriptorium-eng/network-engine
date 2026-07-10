/**
 * ALEPH et OMEGA static data bridge for Tablero player-ui.
 * Reads manifest, wave-A anchors, medidor estado.json — no MCP fetch.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { resolveLineasBasePath, resolveMedidorCasosPath, resolveZeusMcpPorts, resolveZeusUiPorts } from '@zeus/presets-sdk';
import { buildAnchorGrid } from '@zeus/presets-sdk/anchor-grid';
import { formatShellTag } from '@zeus/ui-kit';

function lineasSourceRoot() {
  return resolveLineasBasePath();
}

const DEFAULT_PATHS = {
  get manifest() {
    return path.join(lineasSourceRoot(), 'espana/manifest.json');
  },
  get waveAAnchors() {
    return path.join(lineasSourceRoot(), 'scripts/fetch-priority-viaje1.json');
  },
  get medidorCasos() {
    return resolveMedidorCasosPath('espana');
  },
  prensaBase: '/prensa/caso'
};

const DEFAULT_LINEA_SERVERS = {
  espana: { tronco: 'linea-espana', satelite: 'linea-wp-historia' }
};

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

export { buildAnchorGrid };

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
    defaultPresets: {
      A: 'aleph-tronco-puro',
      B: 'aleph-wp-cache',
      C: 'aleph-firehose-browse',
      ...(aleph.defaultPresets || {})
    },
    defaultCaso: aleph.defaultCaso || 'aeo-p24-linea',
    defaultLinea,
    satelite_wp: getSateliteWp(defaultLinea, paths),
    casos: aleph.casos || ['aeo-p24-linea', 'aeo-tronco-caso1', 'aeo-caso2-2026'],
    theme: aleph.theme || 'Scriptorium-Skins',
    branding: aleph.branding || {
      title: 'Tablero ALEPH',
      tag: formatShellTag()
    },
    lineaServers: aleph.lineaServers || DEFAULT_LINEA_SERVERS,
    view: {
      host: config.view?.host || resolveZeusUiPorts().view.host,
      port: config.view?.port || resolveZeusUiPorts().view.port,
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
  const mcp = resolveZeusMcpPorts();
  const uis = resolveZeusUiPorts();
  const firehoseUiPort = uis.firehose.port;

  return {
    nodes: [
      {
        id: 'linea-espana',
        port: mcp.lineas.espana,
        role: 'tronco',
        coverage: '450–2026',
        card: cards.espana || null
      },
      {
        id: 'linea-wp-historia',
        port: mcp.lineas.wpHistoria,
        role: 'satelite',
        coverage: '2001–2026',
        card: cards.wpHistoria || null
      },
      {
        id: 'lineas-volume',
        role: 'disco',
        path: 'DISK_02/LINEAS/espana/'
      },
      {
        id: 'fetch_batch',
        role: 'python-only',
        path: 'DISK_02/LINEAS/scripts/fetch_batch.py'
      },
      {
        id: 'firehose-mcp-server',
        port: mcp.firehose.disk,
        role: 'disco',
        coverage: 'DISK_01/FIREHOSE',
        card: cards.firehose || null
      },
      {
        id: 'firehose-view-ui',
        port: firehoseUiPort,
        role: 'reader',
        coverage: 'Explorer microposts',
        card: cards.firehoseUi || null
      }
    ],
    lanes: {
      composer: [
        'cache-status',
        'get_nodo(año)',
        'linea://wikitext/{oldid}',
        'firehose_browse → firehose_list_posts',
        'medidor cribar/commit',
        'blockchain/block-N.md'
      ],
      reader: [
        'timeline-nodos',
        'report-nodo',
        'linea://cache/stats (lectura)',
        `firehose-view-ui :${firehoseUiPort}`,
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
