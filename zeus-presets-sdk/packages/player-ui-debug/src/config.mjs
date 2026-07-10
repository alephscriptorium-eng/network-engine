/**
 * Configuration for @zeus/player-ui-debug.
 * Reads ZEUS_* env or falls back to player-ui config.json.
 */

import { createAppConfig } from '@zeus/app-shell';
import {
  readEnvPort,
  resolvePlayerUiEndpoint,
  resolveZeusHost
} from '@zeus/presets-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const { packageDir } = createAppConfig({
  appId: 'debug',
  importMetaUrl: import.meta.url,
  skipConfigFile: true
});

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
  const zeusHost = resolveZeusHost();
  const playerEndpoint = resolvePlayerUiEndpoint(DEFAULTS.port);

  const host = playerEndpoint.host || playerConfig.server?.host || DEFAULTS.host;
  const port = playerEndpoint.port || playerConfig.server?.port || DEFAULTS.port;
  const baseUrl = playerEndpoint.baseUrl;
  const sessionUrl = `${baseUrl}/session`;

  const mcpPort =
    overrides.mcpPort ?? readEnvPort('ZEUS_PORT_PLAYER_DEBUG', DEFAULTS.mcpPort);

  return {
    baseUrl,
    sessionUrl,
    host,
    port,
    mcpHost: zeusHost,
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
