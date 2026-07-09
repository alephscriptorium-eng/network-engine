/**
 * Configuration for @zeus/player-ui-debug.
 * Reads PLAYER_UI_URL env or falls back to player-ui config.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playerUiConfigPath = path.resolve(__dirname, '../../player-ui/src/config.json');

const DEFAULTS = {
  host: 'localhost',
  port: 3013,
  mcpHost: 'localhost',
  mcpPort: 3014,
  refreshHz: 4,
  restPollMs: 7000,
  maxEvents: 32,
  tuiMaxEvents: 8
};

export function loadPlayerUiConfig() {
  try {
    if (fs.existsSync(playerUiConfigPath)) {
      return JSON.parse(fs.readFileSync(playerUiConfigPath, 'utf8'));
    }
  } catch {
    // fall through
  }
  return {};
}

/**
 * @param {Partial<typeof DEFAULTS & { baseUrl?: string, sessionUrl?: string, debugServer?: boolean }>} [overrides]
 */
export function getDebugConfig(overrides = {}) {
  const playerConfig = loadPlayerUiConfig();
  const envUrl = process.env.PLAYER_UI_URL;

  let host = playerConfig.server?.host ?? DEFAULTS.host;
  let port = playerConfig.server?.port ?? DEFAULTS.port;

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      host = parsed.hostname || host;
      port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
    } catch {
      // keep defaults from config.json
    }
  }

  const baseUrl = envUrl?.replace(/\/$/, '') || `http://${host}:${port}`;
  const sessionUrl = `${baseUrl}/session`;

  const mcpPort =
    overrides.mcpPort ??
    (process.env.PLAYER_DEBUG_MCP_PORT ? Number(process.env.PLAYER_DEBUG_MCP_PORT) : DEFAULTS.mcpPort);

  return {
    baseUrl,
    sessionUrl,
    host,
    port,
    mcpHost: DEFAULTS.mcpHost,
    mcpPort,
    defaultCaso: playerConfig.aleph?.defaultCaso ?? 'aeo-p24-linea',
    refreshHz: DEFAULTS.refreshHz,
    restPollMs: DEFAULTS.restPollMs,
    maxEvents: DEFAULTS.maxEvents,
    tuiMaxEvents: DEFAULTS.tuiMaxEvents,
    debugServer: playerConfig.debug === true,
    ...overrides,
    mcpPort
  };
}
