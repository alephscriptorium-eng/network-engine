/**
 * Shared Zeus ecosystem MCP discovery + UI mesh configuration.
 * Merge order: DEFAULT → data/zeus-discovery.json → local config.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { applyEnvToMcp, applyEnvToUis, mcpToUrls } from './zeus-env.mjs';

export const DEFAULT_ZEUS_UI_MESH = {
  editor: {
    host: 'localhost',
    port: 3012,
    path: '/',
    label: 'Editor',
    emoji: '🔧'
  },
  player: {
    host: 'localhost',
    port: 3013,
    path: '/',
    label: 'Tablero',
    emoji: '🎛️'
  },
  view: {
    host: 'localhost',
    port: 3015,
    path: '/',
    label: 'Cache',
    emoji: '📂'
  },
  firehose: {
    host: 'localhost',
    port: 3016,
    path: '/',
    label: 'Firehose',
    emoji: '🔥'
  },
  session: {
    host: 'localhost',
    port: 3013,
    path: '/session',
    label: 'Sesión',
    emoji: '🔍'
  }
};

export const DEFAULT_ZEUS_MCP = {
  solar: { sun: 4101, moon: 4102, earth: 4103 },
  lineas: { espana: 4111, wpHistoria: 4112 },
  firehose: { disk: 3008 },
  playerDebug: { monitor: 3014 }
};

export const DEFAULT_ZEUS_DISCOVERY = {
  timeoutMs: 2000,
  urls: []
};

DEFAULT_ZEUS_DISCOVERY.urls = mcpToUrls('localhost', DEFAULT_ZEUS_MCP);

const GLOBAL_NAV_ORDER = ['editor', 'player', 'view', 'firehose', 'session'];

const DISCOVERY_FILENAME = 'zeus-discovery.json';

function mergeUrls(base = [], override = []) {
  const merged = [...base];
  for (const url of override) {
    if (url && !merged.includes(url)) merged.push(url);
  }
  return merged;
}

function loadSharedDiscoveryFile(dataDir) {
  if (!dataDir) return {};
  const filePath = path.join(dataDir, DISCOVERY_FILENAME);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // fall through
  }
  return {};
}

function mergeUiRecord(base = {}, override = {}) {
  const merged = { ...base };
  for (const [id, entry] of Object.entries(override)) {
    if (!entry || typeof entry !== 'object') continue;
    merged[id] = { ...merged[id], ...entry };
  }
  return merged;
}

function localConfigToUiMesh(localConfig = {}) {
  const out = { ...(localConfig.uiMesh || {}) };
  for (const id of ['editor', 'player', 'view', 'firehose']) {
    const block = localConfig[id];
    if (block && (block.host || block.port || block.path || block.url)) {
      out[id] = { ...(out[id] || {}), ...block };
    }
  }
  return out;
}

/**
 * @param {object} entry
 */
export function buildUiHref(entry) {
  if (entry.url) {
    const base = String(entry.url).replace(/\/$/, '');
    const p = entry.path || '/';
    return p === '/' ? `${base}/` : `${base}${p.startsWith('/') ? p : `/${p}`}`;
  }
  const host = entry.host || 'localhost';
  const port = entry.port;
  const p = entry.path || '/';
  return `http://${host}:${port}${p === '/' ? '/' : p}`;
}

/**
 * @param {object} entry
 * @param {string|null} selfUiId
 */
export function resolveNavHref(entry, selfUiId) {
  const id = entry.id;
  if (id === 'session' && selfUiId === 'player') {
    return entry.path || '/session';
  }
  if (id === selfUiId) {
    return entry.path || '/';
  }
  return buildUiHref(entry);
}

/**
 * @param {string|null} selfUiId
 * @param {string} entryId
 */
export function isNavExternal(selfUiId, entryId) {
  if (entryId === 'session') return selfUiId !== 'player';
  return entryId !== selfUiId;
}

/**
 * Resolve UI mesh from layered config.
 * @param {{ dataDir?: string, localConfig?: object, selfUiId?: string|null }} opts
 */
export function resolveUiMesh({ dataDir, localConfig = {}, selfUiId = null } = {}) {
  const shared = loadSharedDiscoveryFile(dataDir);
  let uis = mergeUiRecord(DEFAULT_ZEUS_UI_MESH, shared.uis || {});
  uis = applyEnvToUis(uis, shared.host);
  uis = mergeUiRecord(uis, localConfigToUiMesh(localConfig));

  const entries = GLOBAL_NAV_ORDER.filter((id) => uis[id]).map((id) => {
    const raw = { id, ...uis[id] };
    return {
      id,
      href: resolveNavHref(raw, selfUiId),
      label: raw.label || id,
      emoji: raw.emoji || '',
      external: isNavExternal(selfUiId, id),
      pageKey: id
    };
  });

  return { uis, entries, selfUiId };
}

/**
 * Resolve discoverServers() sources from layered config.
 * @param {{ dataDir?: string, localDiscovery?: { urls?: string[], timeoutMs?: number } }} opts
 * @returns {{ urls: string[], timeoutMs: number }}
 */
export function resolveDiscoverySources({ dataDir, localDiscovery = {} } = {}) {
  const timeoutMs =
    localDiscovery.timeoutMs ??
    loadSharedDiscoveryFile(dataDir).timeoutMs ??
    DEFAULT_ZEUS_DISCOVERY.timeoutMs;

  if (localDiscovery.exclusiveUrls && localDiscovery.urls?.length) {
    return { urls: [...localDiscovery.urls], timeoutMs };
  }

  const shared = loadSharedDiscoveryFile(dataDir);
  const mcpBlock = { ...DEFAULT_ZEUS_MCP, ...shared.mcp };
  const { host, mcp } = applyEnvToMcp(mcpBlock, shared.host);
  const derivedUrls = mcpToUrls(host, mcp);
  const urls = mergeUrls(
    mergeUrls(derivedUrls, shared.urls || []),
    localDiscovery.urls || []
  );
  return { urls, timeoutMs };
}
