/**
 * Path resolution for the lineas volume (DISK_02/LINEAS).
 */

import { join } from 'node:path';
import { resolveVolume } from './volumes.mjs';

export const LINEAS_VOLUME_ID = 'lineas';
const CACHE_SEGMENT = '/cache/';

/**
 * Whether a line-relative path targets cached wikitext under a satellite tree.
 */
export function isLineasCachePath(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/');
  return normalized.includes(CACHE_SEGMENT) || normalized.startsWith('cache/');
}

/**
 * Primary base path for loaders, view-ui, and player-ui.
 * Honors ZEUS_VOLUME_LINEAS via resolveVolume.
 */
export function resolveLineasBasePath() {
  return resolveVolume(LINEAS_VOLUME_ID).absPath;
}

/**
 * DISK_02/LINEAS absolute path (alias of resolveLineasBasePath).
 */
export function resolveLineasVolumeRoot() {
  return resolveLineasBasePath();
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

/** @deprecated Use resolveLineasVolumePath */
export function resolveLineasSourcePath(relPath) {
  return resolveLineasVolumePath(relPath);
}

/**
 * Resolve a file path within a line instance.
 * @param {string} linePath - absolute line root (e.g. .../DISK_02/LINEAS/espana)
 * @param {string} relPath - path relative to line root
 */
export function resolveLineasLineFilePath(linePath, relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized ? join(linePath, normalized) : linePath;
}

/**
 * Resolve satellite cache directory.
 * @param {string} satDir - absolute satellite dir (e.g. .../espana/wp/historia)
 */
export function resolveLineasSatCacheDir(satDir) {
  return join(satDir, 'cache');
}
