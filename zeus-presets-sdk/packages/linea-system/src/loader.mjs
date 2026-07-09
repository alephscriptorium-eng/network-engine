/**
 * Read-only loader for network-engine/lineas-poder manifests and nodo metadata.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import { SATELITE_COVERAGE, TRONCO_COVERAGE } from './lineas.mjs';
import {
  resolveLineasBasePath,
  resolveLineasSatCacheDir
} from '@zeus/presets-sdk';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_BASE_PATH = resolveLineasBasePath();

const MONTHS = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11
};

export function parseWpTimestamp(ts) {
  if (!ts || typeof ts !== 'string') return null;

  const withTime = ts.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (withTime) {
    const [, hh, mm, dd, mon, yyyy] = withTime;
    const m = MONTHS[mon.toLowerCase()];
    if (m === undefined) return null;
    return Date.UTC(Number(yyyy), m, Number(dd), Number(hh), Number(mm), 0);
  }

  const noTime = ts.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (noTime) {
    const [, dd, mon, yyyy] = noTime;
    const m = MONTHS[mon.toLowerCase()];
    if (m === undefined) return null;
    return Date.UTC(Number(yyyy), m, Number(dd), 0, 0, 0);
  }

  return null;
}

function slimRegistro(registro) {
  return {
    id: registro.id,
    oldid: registro.oldid,
    timestamp: registro.timestamp,
    section: registro.section ?? null,
    milestone: registro.milestone ?? false
  };
}

function parseAnchorYear(note) {
  if (!note || typeof note !== 'string') return null;
  const match = note.match(/WP\s+(\d{4})/);
  return match ? Number(match[1]) : null;
}

async function loadWaveAAnchors(basePath) {
  const anchorsPath = path.join(basePath, 'scripts/fetch-priority-viaje1.json');
  try {
    const raw = JSON.parse(await fs.readFile(anchorsPath, 'utf8'));
    const anchors = Array.isArray(raw)
      ? raw.filter((entry) => entry.tier === 'nodo-anchor' && entry.nodo_id)
      : [];
    const byNodoId = {};
    for (const anchor of anchors) {
      if (byNodoId[anchor.nodo_id]) continue;
      byNodoId[anchor.nodo_id] = {
        nodo_id: anchor.nodo_id,
        oldid: anchor.oldid,
        note: anchor.note,
        anchor_year: parseAnchorYear(anchor.note)
      };
    }
    return { anchors, byNodoId };
  } catch (err) {
    console.warn(`[loadWaveAAnchors] Could not load anchors: ${err.message}`);
    return { anchors: [], byNodoId: {} };
  }
}

async function loadNodoSections(satDir) {
  const sectionsPath = path.join(satDir, 'nodo-sections.json');
  try {
    const raw = JSON.parse(await fs.readFile(sectionsPath, 'utf8'));
    return raw.nodos ?? {};
  } catch (err) {
    console.warn(`[loadNodoSections] Could not load nodo-sections.json: ${err.message}`);
    return {};
  }
}

function buildSectionIndex(registroIndex) {
  const bySection = {};
  for (const registro of registroIndex) {
    if (!registro.section) continue;
    if (!bySection[registro.section]) bySection[registro.section] = [];
    bySection[registro.section].push(registro);
  }
  return bySection;
}

async function loadCuratedRegistroIds(registrosDir) {
  const curated = new Set();
  try {
    const entries = await fs.readdir(registrosDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const idMatch = entry.name.match(/^(r\d+)/);
      if (idMatch) curated.add(idMatch[1]);
    }
  } catch {
    // registros dir may be absent
  }
  return curated;
}

async function loadWpHistoriaIndex(satDir) {
  const manifestPath = path.join(satDir, 'manifest.json');
  const raw = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  const milestones = raw.meta?.milestones ?? [];
  const extremes = raw.meta?.snapshots ?? {};
  const registroIndex = (raw.registros ?? []).map(slimRegistro);

  const byDate = registroIndex
    .map((entry) => ({ ...entry, dateMs: parseWpTimestamp(entry.timestamp) }))
    .filter((entry) => entry.dateMs != null)
    .sort((a, b) => a.dateMs - b.dateMs);

  const cacheDir = path.join(resolveLineasSatCacheDir(satDir), 'snapshots');
  const registrosDir = path.join(satDir, 'registros');

  let cachedOldids = [];
  let cachedWikitexts = 0;
  try {
    const files = await fs.readdir(cacheDir);
    const wikitextFiles = files.filter((f) => f.endsWith('.wikitext'));
    cachedWikitexts = wikitextFiles.length;
    cachedOldids = wikitextFiles.map((f) => parseInt(f.replace('.wikitext', ''), 10)).filter(Number.isFinite);
  } catch (err) {
    console.warn(`[loadWpHistoriaIndex] Could not scan cache/snapshots: ${err.message}`);
  }

  let curatedRegistros = 0;
  let curatedRegistroIds = new Set();
  try {
    const entries = await fs.readdir(registrosDir, { withFileTypes: true });
    curatedRegistros = entries.filter((e) => e.isDirectory()).length;
    curatedRegistroIds = await loadCuratedRegistroIds(registrosDir);
  } catch (err) {
    console.warn(`[loadWpHistoriaIndex] Could not scan registros: ${err.message}`);
  }

  const nodoSections = await loadNodoSections(satDir);
  const sectionIndex = buildSectionIndex(registroIndex);
  const lineasRoot = path.resolve(satDir, '../../..');
  const waveA = await loadWaveAAnchors(lineasRoot);

  const milestoneCount = registroIndex.filter((r) => r.milestone).length;
  const milestoneOldids = registroIndex.filter((r) => r.milestone).map((r) => r.oldid);
  const milestonesWithoutBody = milestoneOldids.filter((oid) => !cachedOldids.includes(oid)).length;
  const coverage_pct = raw.meta?.registro_count ? (cachedWikitexts / raw.meta.registro_count) * 100 : 0;

  return {
    meta: {
      corpus: raw.meta?.corpus,
      title: raw.meta?.title,
      registro_count: raw.meta?.registro_count,
      milestones,
      extremes
    },
    milestones,
    extremes,
    registroIndex,
    byDate,
    nodoSections,
    sectionIndex,
    waveA,
    curatedRegistroIds,
    coverage: SATELITE_COVERAGE,
    cacheStats: {
      registro_count: raw.meta?.registro_count ?? 0,
      curated_registros: curatedRegistros,
      cached_wikitexts: cachedWikitexts,
      cached_oldids: cachedOldids.sort((a, b) => a - b),
      milestone_count: milestoneCount,
      milestones_sin_cuerpo: Math.max(0, milestonesWithoutBody),
      coverage_pct: parseFloat(coverage_pct.toFixed(2))
    },
    satDir
  };
}

async function loadLineInstance(basePath, entry) {
  const linePath = path.join(basePath, entry.path);
  const manifest = JSON.parse(await fs.readFile(path.join(linePath, 'manifest.json'), 'utf8'));

  const nodos = {};
  for (const nodoRef of manifest.nodos ?? []) {
    const metaRel = nodoRef.paths?.meta ?? `nodos/${nodoRef.id}/meta.json`;
    const meta = JSON.parse(await fs.readFile(path.join(linePath, metaRel), 'utf8'));
    nodos[nodoRef.id] = { ...nodoRef, ...meta };
  }

  let satellite = null;
  const satRel = manifest.meta?.satelite_wp;
  if (satRel) {
    satellite = await loadWpHistoriaIndex(path.join(linePath, satRel));
  }

  return {
    entry,
    manifest,
    nodos,
    satellite,
    linePath,
    coverage: TRONCO_COVERAGE
  };
}

/**
 * Loads registry.yaml and all line instances under basePath (read-only).
 * @param {string} [basePath]
 */
export async function loadLineaData(basePath = DEFAULT_BASE_PATH) {
  const registryRaw = await fs.readFile(path.join(basePath, 'registry.yaml'), 'utf8');
  const registry = yaml.parse(registryRaw);

  const lineas = {};
  for (const entry of registry) {
    lineas[entry.id] = await loadLineInstance(basePath, entry);
  }

  return { basePath, registry, lineas };
}

export function resolveNodo(lineData, year, coverage = lineData.coverage) {
  const y = Number(year);
  if (!Number.isFinite(y)) {
    return { error: `Invalid year "${year}": must be a number`, coverage };
  }
  if (y < coverage.min || y > coverage.max) {
    return { error: `Year ${y} outside coverage`, coverage };
  }

  const nodo = Object.values(lineData.nodos).find(
    (entry) => y >= entry.año_ini && (entry.año_fin == null || y <= entry.año_fin)
  );
  if (!nodo) {
    return { error: `No nodo for year ${y}`, coverage };
  }

  return {
    year: y,
    nodo: {
      id: nodo.id,
      parte: nodo.parte,
      etiqueta: nodo.etiqueta,
      tesis_villacañas: nodo.tesis_villacañas,
      articulos_wp: nodo.articulos_wp,
      año_ini: nodo.año_ini,
      año_fin: nodo.año_fin
    }
  };
}

export function resolveParte(lineData, parteId) {
  const parte = lineData.manifest.meta?.partes?.find((entry) => entry.id === parteId);
  if (!parte) {
    return { error: `Unknown parte "${parteId}"` };
  }
  return {
    id: parte.id,
    titulo: parte.titulo,
    año_ini: parte.año_ini,
    año_fin: parte.año_fin,
    nodos: parte.nodos
  };
}

export function resolveOldid(satellite, year) {
  const y = Number(year);
  const coverage = satellite.coverage;
  if (!Number.isFinite(y)) {
    return { error: `Invalid year "${year}": must be a number`, coverage };
  }
  if (y < coverage.min || y > coverage.max) {
    return { error: `Year ${y} outside WP historia coverage`, coverage };
  }

  const targetMs = Date.UTC(y, 11, 31, 23, 59, 59);
  const { byDate } = satellite;
  let lo = 0;
  let hi = byDate.length - 1;
  let best = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (byDate[mid].dateMs <= targetMs) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best === -1) {
    return { error: `No registro <= year ${y}`, coverage };
  }

  const reg = byDate[best];
  return {
    year: y,
    oldid: reg.oldid,
    timestamp: reg.timestamp,
    registro_id: reg.id
  };
}

/**
 * Re-scan cache/snapshots and update satellite.cacheStats in place.
 * @param {object} satellite
 */
export async function rescanSatelliteCache(satellite) {
  const cacheDir = path.join(resolveLineasSatCacheDir(satellite.satDir), 'snapshots');
  let cachedOldids = [];
  let cachedWikitexts = 0;

  try {
    const files = await fs.readdir(cacheDir);
    const wikitextFiles = files.filter((f) => f.endsWith('.wikitext'));
    cachedWikitexts = wikitextFiles.length;
    cachedOldids = wikitextFiles
      .map((f) => parseInt(f.replace('.wikitext', ''), 10))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  } catch (err) {
    console.warn(`[rescanSatelliteCache] Could not scan cache/snapshots: ${err.message}`);
  }

  const milestoneOldids = (satellite.registroIndex ?? [])
    .filter((r) => r.milestone)
    .map((r) => r.oldid);
  const milestonesWithoutBody = milestoneOldids.filter((oid) => !cachedOldids.includes(oid)).length;
  const registroCount = satellite.cacheStats?.registro_count ?? 0;
  const coverage_pct = registroCount ? (cachedWikitexts / registroCount) * 100 : 0;

  Object.assign(satellite.cacheStats, {
    cached_wikitexts: cachedWikitexts,
    cached_oldids: cachedOldids,
    milestones_sin_cuerpo: Math.max(0, milestonesWithoutBody),
    coverage_pct: parseFloat(coverage_pct.toFixed(2))
  });

  return satellite.cacheStats;
}

export async function readWikitext(satellite, oldid) {
  const oid = Number(oldid);
  if (!Number.isFinite(oid) || oid <= 0) {
    return { error: `Invalid oldid "${oldid}": must be a positive number` };
  }

  if (!satellite.cacheStats.cached_oldids.includes(oid)) {
    return {
      error: 'not cached',
      cached: false,
      oldid: oid,
      stats: satellite.cacheStats,
      hint: 'Invoca cache_wikitext o usa el botón Cachear en Tablero.',
      action: {
        tool: 'cache_wikitext',
        server: 'linea-wp-historia',
        arguments: { oldid: oid },
        poll: `linea://wikitext/${oid}`
      }
    };
  }

  const cacheRoot = resolveLineasSatCacheDir(satellite.satDir);
  const wikitextPath = path.join(cacheRoot, `snapshots/${oid}.wikitext`);
  const metaPath = path.join(cacheRoot, `snapshots/${oid}.meta.json`);

  try {
    const wikitext = await fs.readFile(wikitextPath, 'utf8');
    let meta = null;
    try {
      meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    } catch {
      // meta.json is optional
    }
    return {
      oldid: oid,
      cached: true,
      wikitext_length: wikitext.length,
      wikitext,
      meta
    };
  } catch (err) {
    return { error: `Failed to read wikitext for oldid ${oid}: ${err.message}` };
  }
}

async function resolveRegistroDir(satellite, registroId, registro) {
  const registrosRoot = path.join(satellite.satDir, 'registros');
  const canonical = path.join(registrosRoot, `${registro.id}-oldid-${registro.oldid}`);

  try {
    const stat = await fs.stat(canonical);
    if (stat.isDirectory()) return canonical;
  } catch {
    // try slug-suffixed folder names below
  }

  try {
    const entries = await fs.readdir(registrosRoot, { withFileTypes: true });
    const matchDir = entries.find(
      (e) => e.isDirectory() && (e.name === registroId || e.name.startsWith(`${registroId}-oldid-`))
    );
    if (matchDir) return path.join(registrosRoot, matchDir.name);
  } catch {
    // registros dir may be absent
  }

  return null;
}

export function validateNodoSectionMappings(lineData) {
  const satellite = lineData.satellite;
  if (!satellite) {
    return { error: 'No satellite data loaded for this line' };
  }

  const issues = [];
  const nodoIds = Object.keys(lineData.nodos).sort();

  for (const nodoId of nodoIds) {
    const mapping = satellite.nodoSections[nodoId];
    if (!mapping?.sections?.length) {
      issues.push({ nodo_id: nodoId, kind: 'missing_mapping' });
      continue;
    }

    const unknownSections = mapping.sections.filter((section) => !satellite.sectionIndex[section]?.length);
    if (unknownSections.length) {
      issues.push({ nodo_id: nodoId, kind: 'unknown_sections', sections: unknownSections });
    }

    const result = resolveRegistrosForNodo(lineData, nodoId);
    if (result.error) {
      issues.push({ nodo_id: nodoId, kind: 'resolve_error', error: result.error });
    } else if (result.total === 0) {
      issues.push({ nodo_id: nodoId, kind: 'empty_registros', sections: mapping.sections });
    }
  }

  return {
    ok: issues.length === 0,
    nodo_count: nodoIds.length,
    issues
  };
}

export async function readRegistro(satellite, registroId) {
  const registro = satellite.registroIndex.find((r) => r.id === registroId);
  if (!registro) {
    return { error: `Unknown registro_id "${registroId}"` };
  }

  const registroDir = await resolveRegistroDir(satellite, registroId, registro);
  if (!registroDir) {
    return {
      error: `Registro directory not found for "${registroId}"`,
      stats: satellite.cacheStats,
      hint: `Solo ${satellite.cacheStats.curated_registros} registros curados disponibles de ${satellite.cacheStats.registro_count} totales`
    };
  }

  try {
    const registroMdPath = path.join(registroDir, 'registro.md');
    const deltaMdPath = path.join(registroDir, 'delta.md');

    const registroMd = await fs.readFile(registroMdPath, 'utf8');
    let deltaMd = null;
    try {
      deltaMd = await fs.readFile(deltaMdPath, 'utf8');
    } catch {
      // delta.md might not exist
    }

    return {
      registro_id: registroId,
      oldid: registro.oldid,
      timestamp: registro.timestamp,
      milestone: registro.milestone,
      registro_md: registroMd,
      delta_md: deltaMd
    };
  } catch (err) {
    return { error: `Failed to read registro "${registroId}": ${err.message}` };
  }
}

function formatRegistroItem(registro, satellite, anchorOldid = null) {
  const cached = satellite.cacheStats.cached_oldids.includes(registro.oldid);
  return {
    registro_id: registro.id,
    oldid: registro.oldid,
    timestamp: registro.timestamp,
    section: registro.section,
    milestone: registro.milestone ?? false,
    cached,
    curated: satellite.curatedRegistroIds.has(registro.id),
    is_anchor: anchorOldid != null && registro.oldid === anchorOldid
  };
}

export function resolveRegistrosForNodo(lineData, nodoId, options = {}) {
  const { limit, milestonesOnly = false } = options;
  const satellite = lineData.satellite;
  if (!satellite) {
    return { error: 'No satellite data loaded for this line' };
  }

  const nodoEntry = lineData.nodos[nodoId];
  if (!nodoEntry) {
    return { error: `Unknown nodo_id "${nodoId}"` };
  }

  const nodoMapEntry = satellite.nodoSections[nodoId];
  if (!nodoMapEntry?.sections?.length) {
    return { error: `No section mapping for nodo "${nodoId}"` };
  }

  const sections = nodoMapEntry.sections;
  const anchor = satellite.waveA.byNodoId[nodoId] ?? null;
  const seenOldids = new Set();
  let registros = [];

  for (const section of sections) {
    const sectionRegs = satellite.sectionIndex[section] ?? [];
    for (const reg of sectionRegs) {
      if (milestonesOnly && !reg.milestone) continue;
      if (seenOldids.has(reg.oldid)) continue;
      seenOldids.add(reg.oldid);
      registros.push(formatRegistroItem(reg, satellite, anchor?.oldid ?? null));
    }
  }

  registros.sort((a, b) => {
    if (a.is_anchor !== b.is_anchor) return a.is_anchor ? -1 : 1;
    const aMs = parseWpTimestamp(a.timestamp) ?? 0;
    const bMs = parseWpTimestamp(b.timestamp) ?? 0;
    return bMs - aMs;
  });

  if (anchor?.oldid != null && !registros.some((r) => r.oldid === anchor.oldid)) {
    const anchorReg = satellite.registroIndex.find((r) => r.oldid === anchor.oldid);
    if (anchorReg) {
      registros.unshift(formatRegistroItem(anchorReg, satellite, anchor.oldid));
    } else {
      registros.unshift({
        registro_id: null,
        oldid: anchor.oldid,
        timestamp: null,
        section: null,
        milestone: false,
        cached: satellite.cacheStats.cached_oldids.includes(anchor.oldid),
        curated: false,
        is_anchor: true
      });
    }
  }

  const total = registros.length;
  if (limit != null && Number.isFinite(Number(limit))) {
    registros = registros.slice(0, Number(limit));
  }

  return {
    nodo_id: nodoId,
    nodo: {
      id: nodoEntry.id,
      etiqueta: nodoEntry.etiqueta,
      año_ini: nodoEntry.año_ini,
      año_fin: nodoEntry.año_fin
    },
    anchor,
    sections,
    registros,
    total,
    cached_count: registros.filter((r) => r.cached).length
  };
}

export function resolveRegistrosForYear(lineData, year, options = {}) {
  const nodoResult = resolveNodo(lineData, year);
  if (nodoResult.error) {
    return nodoResult;
  }

  const registrosResult = resolveRegistrosForNodo(lineData, nodoResult.nodo.id, options);
  if (registrosResult.error) {
    return { ...registrosResult, year: nodoResult.year, nodo: nodoResult.nodo };
  }

  return {
    year: nodoResult.year,
    nodo: nodoResult.nodo,
    anchor: registrosResult.anchor,
    sections: registrosResult.sections,
    registros: registrosResult.registros,
    total: registrosResult.total,
    cached_count: registrosResult.cached_count
  };
}
