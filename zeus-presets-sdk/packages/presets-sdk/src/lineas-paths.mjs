/**
 * Hybrid path resolution for the lineas volume (DISK_02 cache + source manifests).
 */

import { join, resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVolume } from './volumes.mjs';

export const LINEAS_VOLUME_ID = 'lineas';
const CACHE_SEGMENT = '/cache/';

const __dirname = dirname(fileURLToPath(import.meta.url));
const __monorepoRoot = resolve(__dirname, '../..');

function resolveRelative(base, rel) {
  if (!rel) return base;
  if (isAbsolute(rel)) return rel;
  return resolve(base, rel);
}

/**
 * Whether a line-relative path targets cached wikitext under a satellite tree.
 */
export function isLineasCachePath(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/');
  return normalized.includes(CACHE_SEGMENT) || normalized.startsWith('cache/');
}

/**
 * Registry/manifest root (lineas-poder) until full DISK_02 migration.
 */
export function resolveLineasSourceRoot() {
  const volume = resolveVolume(LINEAS_VOLUME_ID);
  if (volume.sourceRoot) {
    return volume.sourceRoot;
  }
  return resolveRelative(__monorepoRoot, '../lineas-poder');
}

/**
 * Primary base path for loaders and view-ui (registry + manifests).
 * Alias of resolveLineasSourceRoot for backward compatibility.
 */
export function resolveLineasBasePath() {
  return resolveLineasSourceRoot();
}

/**
 * DISK_02/LINEAS absolute path (honors ZEUS_VOLUME_LINEAS).
 */
export function resolveLineasVolumeRoot() {
  return resolveVolume(LINEAS_VOLUME_ID).absPath;
}

/**
 * Resolve a path relative to the lineas source root (registry, scripts, manifests).
 * @param {string} relPath
 */
export function resolveLineasSourcePath(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized
    ? join(resolveLineasSourceRoot(), normalized)
    : resolveLineasSourceRoot();
}

/**
 * Resolve a path relative to DISK_02/LINEAS.
 * @param {string} relPath
 */
export function resolveLineasVolumePath(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized
    ? join(resolveLineasVolumeRoot(), normalized)
    : resolveLineasVolumeRoot();
}

/**
 * Resolve a file path within a line instance (hybrid: cache on DISK_02, else source).
 * @param {string} linePath - absolute line root (e.g. .../lineas-poder/espana)
 * @param {string} relPath - path relative to line root
 */
export function resolveLineasLineFilePath(linePath, relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const sourceRoot = resolveLineasSourceRoot();
  const lineRel = relative(sourceRoot, resolve(linePath));

  if (isLineasCachePath(normalized)) {
    const abs = normalized
      ? join(resolveLineasVolumeRoot(), lineRel, normalized)
      : join(resolveLineasVolumeRoot(), lineRel);
    return abs;
  }

  return normalized ? join(linePath, normalized) : linePath;
}

/**
 * Resolve satellite cache directory (snapshots parent) on DISK_02.
 * @param {string} satDir - absolute satellite dir on source (e.g. .../espana/wp/historia)
 */
export function resolveLineasSatCacheDir(satDir) {
  const sourceRoot = resolveLineasSourceRoot();
  const satRel = relative(sourceRoot, resolve(satDir));
  return join(resolveLineasVolumeRoot(), satRel, 'cache');
}
