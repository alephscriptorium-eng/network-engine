import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, relative, extname } from 'node:path';
import { resolveVolume } from './volumes.mjs';

/**
 * Sanitize a relative path — reject absolute paths and traversal segments.
 * Returns normalized forward-slash path or empty string for root.
 */
export function sanitizeRelativePath(relativePath) {
  if (relativePath == null || relativePath === '' || relativePath === '.') {
    return '';
  }

  const normalized = String(relativePath).replace(/\\/g, '/');
  if (normalized.startsWith('/')) {
    throw new Error('Absolute paths are not allowed');
  }

  const segments = normalized.split('/').filter(Boolean);
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error('Path traversal is not allowed');
    }
  }

  return segments.join('/');
}

/**
 * Assert that resolvedPath stays within volumeRoot (defense in depth).
 */
function assertWithinVolume(volumeRoot, resolvedPath) {
  const rel = relative(resolve(volumeRoot), resolve(resolvedPath));
  if (rel.startsWith('..') || rel === '..') {
    throw new Error('Resolved path escapes volume root');
  }
}

/**
 * Resolve a path within a volume given a sanitized relative path.
 */
export function resolveVolumePath(volume, relativePath) {
  const safe = sanitizeRelativePath(relativePath);
  const base = volume.absPath;
  const resolved = safe ? join(base, safe) : base;
  assertWithinVolume(base, resolved);
  return resolved;
}

/**
 * Lazy paginated directory browse for a volume.
 *
 * @param {string} volumeId
 * @param {string} [relativePath='']
 * @param {{ limit?: number, offset?: number }} [options]
 * @returns {Promise<{
 *   volumeId: string,
 *   path: string,
 *   absPath: string,
 *   entries: Array<{ name: string, type: 'dir'|'file', size?: number, ext?: string }>,
 *   total: number,
 *   limit: number,
 *   offset: number,
 *   hasMore: boolean
 * }>}
 */
export async function browseVolume(volumeId, relativePath = '', options = {}) {
  const { limit = 200, offset = 0 } = options;
  const volume = resolveVolume(volumeId);

  if (volume.deferred) {
    throw new Error(`Volume "${volumeId}" is deferred and not available for browse`);
  }

  const safePath = sanitizeRelativePath(relativePath);
  const dirPath = resolveVolumePath(volume, safePath);

  let dirStat;
  try {
    dirStat = await stat(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Path not found: ${safePath || '/'}`);
    }
    throw err;
  }

  if (!dirStat.isDirectory()) {
    throw new Error(`Not a directory: ${safePath || '/'}`);
  }

  const names = await readdir(dirPath);
  const entries = [];

  for (const name of names) {
    const entryPath = join(dirPath, name);
    let entryStat;
    try {
      entryStat = await stat(entryPath);
    } catch {
      continue;
    }

    const entry = { name };
    if (entryStat.isDirectory()) {
      entry.type = 'dir';
    } else {
      entry.type = 'file';
      entry.size = entryStat.size;
      const ext = extname(name);
      if (ext) entry.ext = ext.slice(1).toLowerCase();
    }
    entries.push(entry);
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const total = entries.length;
  const slice = entries.slice(offset, offset + limit);

  return {
    volumeId,
    path: safePath,
    absPath: dirPath,
    entries: slice,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Read a file from a volume.
 *
 * @param {string} volumeId
 * @param {string} relativePath
 * @param {{ encoding?: BufferEncoding }} [options]
 * @returns {Promise<{
 *   volumeId: string,
 *   path: string,
 *   absPath: string,
 *   content: string,
 *   size: number,
 *   encoding: string
 * }>}
 */
export async function readVolumeFile(volumeId, relativePath, options = {}) {
  const { encoding = 'utf8' } = options;
  const volume = resolveVolume(volumeId);

  if (volume.deferred) {
    throw new Error(`Volume "${volumeId}" is deferred and not available for read`);
  }

  const safePath = sanitizeRelativePath(relativePath);
  if (!safePath) {
    throw new Error('File path is required');
  }

  const filePath = resolveVolumePath(volume, safePath);

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${safePath}`);
    }
    throw err;
  }

  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${safePath}`);
  }

  const content = await readFile(filePath, encoding);

  return {
    volumeId,
    path: safePath,
    absPath: filePath,
    content,
    size: fileStat.size,
    encoding,
  };
}
