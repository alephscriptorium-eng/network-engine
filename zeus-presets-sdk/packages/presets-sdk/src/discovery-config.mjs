/**
 * Shared Zeus ecosystem MCP discovery configuration.
 * Merge order: DEFAULT_ZEUS_DISCOVERY → data/zeus-discovery.json → local config.json discovery section.
 */

import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_ZEUS_DISCOVERY = {
  urls: [
    'http://localhost:4101',
    'http://localhost:4102',
    'http://localhost:4103',
    'http://localhost:4111',
    'http://localhost:4112'
  ],
  timeoutMs: 2000
};

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

/**
 * Resolve discoverServers() sources from layered config.
 * @param {{ dataDir?: string, localDiscovery?: { urls?: string[], timeoutMs?: number } }} opts
 * @returns {{ urls: string[], timeoutMs: number }}
 */
export function resolveDiscoverySources({ dataDir, localDiscovery = {} } = {}) {
  const shared = loadSharedDiscoveryFile(dataDir);
  const urls = mergeUrls(
    mergeUrls(DEFAULT_ZEUS_DISCOVERY.urls, shared.urls || []),
    localDiscovery.urls || []
  );
  const timeoutMs =
    localDiscovery.timeoutMs ??
    shared.timeoutMs ??
    DEFAULT_ZEUS_DISCOVERY.timeoutMs;
  return { urls, timeoutMs };
}
