import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const MONOREPO_ROOT = join(PACKAGE_ROOT, '../..');

let _dotenvLoaded = false;
let _configCache = null;

function ensureDotenv() {
  if (_dotenvLoaded) return;
  _dotenvLoaded = true;
  const envPath = join(MONOREPO_ROOT, '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

/**
 * Resolve the VOLUMES root directory.
 * Honors ZEUS_VOLUMES_ROOT; defaults to MONOREPO_ROOT/VOLUMES.
 */
export function resolveVolumesRoot() {
  ensureDotenv();
  const override = process.env.ZEUS_VOLUMES_ROOT;
  if (override) {
    return resolve(override);
  }
  return join(MONOREPO_ROOT, 'VOLUMES');
}

/**
 * Load and cache volumes.json from the VOLUMES root.
 */
export function loadVolumesConfig() {
  if (_configCache) return _configCache;

  const root = resolveVolumesRoot();
  const configPath = join(root, 'volumes.json');
  if (!existsSync(configPath)) {
    throw new Error(`volumes.json not found at ${configPath}`);
  }

  const raw = readFileSync(configPath, 'utf8');
  _configCache = JSON.parse(raw);
  return _configCache;
}

/**
 * Expand ${VAR} placeholders in a string using process.env with fallback.
 */
function expandEnvVar(value, fallback) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!match) return value;
  const envKey = match[1];
  return process.env[envKey] || fallback || value;
}

/**
 * Resolve a relative path against a base directory.
 */
function resolveRelative(base, relative) {
  if (!relative) return base;
  if (isAbsolute(relative)) return relative;
  return resolve(base, relative);
}

/**
 * List all volume ids defined in volumes.json.
 */
export function listVolumes() {
  const config = loadVolumesConfig();
  return Object.keys(config.volumes);
}

/**
 * Resolve a volume by id, merging config and computing absPath.
 */
export function resolveVolume(id) {
  ensureDotenv();
  const config = loadVolumesConfig();
  const entry = config.volumes[id];
  if (!entry) {
    throw new Error(`Unknown volume id: ${id}`);
  }

  const volumesRoot = resolveVolumesRoot();
  const monorepoRoot = MONOREPO_ROOT;

  let absPath;
  const lineasEnvOverride = id === 'lineas' ? process.env.ZEUS_VOLUME_LINEAS : null;
  if (lineasEnvOverride) {
    absPath = resolve(lineasEnvOverride);
  } else if (entry.pathOverride) {
    absPath = resolveRelative(monorepoRoot, entry.pathOverride);
  } else if (entry.path) {
    absPath = join(volumesRoot, entry.path);
  } else {
    throw new Error(`Volume "${id}" has no path or pathOverride`);
  }

  const resolved = {
    id,
    disk: entry.disk,
    path: entry.path || null,
    pathOverride: entry.pathOverride || null,
    absPath: resolve(absPath),
    readonly: entry.readonly ?? true,
    label: entry.label || id,
    deferred: entry.deferred ?? false,
    corpora: entry.corpora || [],
  };

  if (entry.source) {
    const defaultRemote = entry.source.defaultRemotePath
      ? resolveRelative(monorepoRoot, entry.source.defaultRemotePath)
      : null;
    const defaultSource = entry.source.defaultSourcePath
      ? resolveRelative(monorepoRoot, entry.source.defaultSourcePath)
      : null;
    resolved.source = {
      ...entry.source,
      remotePath: expandEnvVar(entry.source.remotePath, defaultRemote),
      defaultRemotePath: defaultRemote,
      sourcePath: expandEnvVar(entry.source.sourcePath, defaultSource),
      defaultSourcePath: defaultSource,
    };
    if (defaultSource || resolved.source.sourcePath) {
      resolved.sourceRoot = resolve(resolved.source.sourcePath || defaultSource);
    }
  }

  return resolved;
}

/**
 * Clear cached config (useful for tests).
 */
export function resetVolumesCache() {
  _configCache = null;
}
