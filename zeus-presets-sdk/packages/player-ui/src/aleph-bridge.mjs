/**
 * ALEPH et OMEGA static data bridge for Tablero player-ui.
 * Reads manifest, wave-A anchors, medidor estado.json — no MCP fetch.
 */

import fs from 'node:fs';
import path from 'node:path';
import { packageDir } from './config.mjs';

const ZEUS_ROOT = path.resolve(packageDir, '../..');
const NETWORK_ENGINE = path.resolve(ZEUS_ROOT, '..');
const SCRIPTORIUM_ROOT = path.resolve(NETWORK_ENGINE, '..');

const DEFAULT_PATHS = {
  manifest: path.join(NETWORK_ENGINE, 'lineas-poder/espana/manifest.json'),
  waveAAnchors: path.join(NETWORK_ENGINE, 'lineas-poder/scripts/fetch-priority-viaje1.json'),
  medidorCasos: path.join(SCRIPTORIUM_ROOT, 'medidor-poder-politico/data/casos'),
  prensaBase: '/prensa/caso'
};

const STUB_BYTE_THRESHOLD = 100;

let manifestCache = null;
let anchorsCache = null;

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

export function loadManifest(paths = {}) {
  if (manifestCache) return manifestCache;
  const p = resolveAlephPaths(paths).manifest;
  const data = readJson(p);
  if (data.error) return data;
  manifestCache = data;
  return data;
}

export function loadWaveAAnchors(paths = {}) {
  if (anchorsCache) return anchorsCache;
  const p = resolveAlephPaths(paths).waveAAnchors;
  const raw = readJson(p);
  if (raw.error) return raw;
  const anchors = Array.isArray(raw)
    ? raw.filter(e => e.tier === 'nodo-anchor' && e.nodo_id)
    : [];
  anchorsCache = anchors;
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

function parseAnchorYear(note) {
  if (!note || typeof note !== 'string') return null;
  const match = note.match(/WP\s+(\d{4})/);
  return match ? Number(match[1]) : null;
}

/**
 * @param {number[]} cachedOldids
 * @param {Map<number, number>} [wikitextLengths] - oldid -> byte length (optional)
 */
export function buildAnchorGrid(cachedOldids = [], wikitextLengths = null, paths = {}) {
  const manifest = loadManifest(paths);
  const anchors = loadWaveAAnchors(paths);
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
      status
    };
  });

  const summary = {
    total: cells.length,
    cached: cells.filter(c => c.status === 'cached').length,
    stub: cells.filter(c => c.status === 'stub').length,
    missing: cells.filter(c => c.status === 'missing').length
  };

  return { cells, summary };
}

export function getAlephConfig(config = {}) {
  const aleph = config.aleph || {};
  const paths = resolveAlephPaths(aleph.paths);
  return {
    defaultPresets: aleph.defaultPresets || { A: 'aleph-tronco-puro', B: 'aleph-wp-bridge' },
    defaultCaso: aleph.defaultCaso || 'aeo-p24-linea',
    casos: aleph.casos || ['aeo-p24-linea', 'aeo-tronco-caso1', 'aeo-caso2-2026'],
    theme: aleph.theme || 'Scriptorium-Skins',
    branding: aleph.branding || {
      title: 'Tablero ALEPH',
      tag: 'Animus Iocandi · Scriptorium Skins'
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

export function clearAlephCache() {
  manifestCache = null;
  anchorsCache = null;
}
