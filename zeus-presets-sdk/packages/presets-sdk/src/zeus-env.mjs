/**
 * Canonical Zeus environment variable maps and port resolution.
 */

import { loadZeusEnv } from './load-zeus-env.mjs';
import { DEFAULT_ZEUS_MCP, DEFAULT_ZEUS_UI_MESH } from './discovery-config.mjs';

loadZeusEnv();

export const UI_PORT_ENV = {
  editor: 'ZEUS_PORT_EDITOR',
  player: 'ZEUS_PORT_PLAYER',
  view: 'ZEUS_PORT_VIEW',
  firehose: 'ZEUS_PORT_FIREHOSE'
};

export const MCP_PORT_ENV = {
  'solar.sun': 'ZEUS_MCP_SUN',
  'solar.moon': 'ZEUS_MCP_MOON',
  'solar.earth': 'ZEUS_MCP_EARTH',
  'lineas.espana': 'ZEUS_MCP_LINEA_ESPAN',
  'lineas.wpHistoria': 'ZEUS_MCP_LINEA_WP',
  'firehose.disk': 'ZEUS_MCP_FIREHOSE',
  'playerDebug.monitor': 'ZEUS_PORT_PLAYER_DEBUG'
};

export const APP_ID_UI_ENV = {
  editor: 'ZEUS_PORT_EDITOR',
  player: 'ZEUS_PORT_PLAYER',
  view: 'ZEUS_PORT_VIEW',
  firehose: 'ZEUS_PORT_FIREHOSE',
  debug: 'ZEUS_PORT_PLAYER_DEBUG'
};

/** Canonical ZEUS_* env contract for docs and lint. */
export const ZEUS_ENV_CONTRACT = [
  { name: 'ZEUS_HOST', role: 'Shared host for UIs and MCP servers' },
  { name: 'ZEUS_PORT_EDITOR', role: 'Editor UI HTTP port' },
  { name: 'ZEUS_PORT_PLAYER', role: 'Player UI HTTP port' },
  { name: 'ZEUS_PORT_VIEW', role: 'View UI HTTP port' },
  { name: 'ZEUS_PORT_FIREHOSE', role: 'Firehose view UI HTTP port' },
  { name: 'ZEUS_PORT_PLAYER_DEBUG', role: 'Player debug MCP HTTP port' },
  { name: 'ZEUS_MCP_SUN', role: 'Solar sun MCP port' },
  { name: 'ZEUS_MCP_MOON', role: 'Solar moon MCP port' },
  { name: 'ZEUS_MCP_EARTH', role: 'Solar earth MCP port' },
  { name: 'ZEUS_MCP_LINEA_ESPAN', role: 'Linea espana MCP port' },
  { name: 'ZEUS_MCP_LINEA_WP', role: 'Linea wp-historia MCP port' },
  { name: 'ZEUS_MCP_FIREHOSE', role: 'Firehose disk MCP port' },
  { name: 'ZEUS_VOLUMES_ROOT', role: 'VOLUMES root directory' },
  { name: 'ZEUS_FIREHOSE_REMOTE_PATH', role: 'Optional remote Firehose sync source' },
  { name: 'ZEUS_LINEAS_IMPORT_SOURCE', role: 'Optional external lineas tree for --import' },
  { name: 'ZEUS_MEDIDOR_IMPORT_SOURCE', role: 'Optional external medidor data/casos tree for --import' }
];

/**
 * @param {string} name
 * @param {number} fallback
 */
export function readEnvPort(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {string} name
 * @param {number} fallback
 */
export function envPort(name, fallback) {
  return readEnvPort(name, fallback);
}

export function resolveZeusHost(fallback = 'localhost') {
  return process.env.ZEUS_HOST || fallback;
}

export function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * @param {object} mcp
 * @param {string} [host]
 */
export function applyEnvToMcp(mcp, host) {
  const out = structuredClone(mcp);
  for (const [mcpPath, envKey] of Object.entries(MCP_PORT_ENV)) {
    const parts = mcpPath.split('.');
    const current = parts.reduce((o, k) => o?.[k], out);
    setNested(out, mcpPath, readEnvPort(envKey, current));
  }
  return { host: resolveZeusHost(host || 'localhost'), mcp: out };
}

/**
 * @param {object} uis
 * @param {string} [host]
 */
export function applyEnvToUis(uis, host) {
  const out = structuredClone(uis);
  const resolvedHost = resolveZeusHost(host || 'localhost');
  for (const [uiId, envKey] of Object.entries(UI_PORT_ENV)) {
    if (!out[uiId]) continue;
    out[uiId].host = resolvedHost;
    out[uiId].port = envPort(envKey, out[uiId].port);
  }
  if (out.session) {
    out.session.host = resolvedHost;
    if (out.player?.port) out.session.port = out.player.port;
  }
  return out;
}

/**
 * @param {string} host
 * @param {object} mcp
 */
export function mcpToUrls(host, mcp) {
  const ports = [];
  for (const group of Object.values(mcp || {})) {
    for (const port of Object.values(group)) {
      if (typeof port === 'number') ports.push(`http://${host}:${port}`);
    }
  }
  return ports.sort((a, b) => Number(a.split(':').pop()) - Number(b.split(':').pop()));
}

/**
 * @param {object} [baseMcp]
 */
export function resolveZeusMcpPorts(baseMcp = DEFAULT_ZEUS_MCP) {
  return applyEnvToMcp(baseMcp).mcp;
}

/**
 * @param {object} [baseUis]
 */
export function resolveZeusUiPorts(baseUis = DEFAULT_ZEUS_UI_MESH) {
  return applyEnvToUis(baseUis);
}

/**
 * @param {string} appId
 * @param {number} fallback
 */
export function resolveAppPort(appId, fallback) {
  const envKey = APP_ID_UI_ENV[appId];
  return envKey ? envPort(envKey, fallback) : fallback;
}

/**
 * Player-ui base URL from ZEUS_HOST + ZEUS_PORT_PLAYER.
 */
export function resolvePlayerUiBaseUrl() {
  const host = resolveZeusHost();
  const port = envPort('ZEUS_PORT_PLAYER', DEFAULT_ZEUS_UI_MESH.player.port);
  return `http://${host}:${port}`;
}

/**
 * Player-ui host/port/baseUrl from ZEUS_* env.
 */
export function resolvePlayerUiEndpoint(fallbackPort = DEFAULT_ZEUS_UI_MESH.player.port) {
  const host = resolveZeusHost();
  const port = envPort('ZEUS_PORT_PLAYER', fallbackPort);
  const baseUrl = `http://${host}:${port}`;
  return { baseUrl, host, port };
}
