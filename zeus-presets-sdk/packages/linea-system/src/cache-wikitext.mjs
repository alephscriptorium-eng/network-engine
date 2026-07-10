/**
 * Async wikitext cache fetch via fetch_snapshot.py (DISK_02/LINEAS/scripts).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { rescanSatelliteCache } from './loader.mjs';

const pendingFetches = new Map();

/**
 * @param {object} satellite
 * @returns {string}
 */
export function resolveFetchScriptsDir(satellite) {
  return path.resolve(satellite.satDir, '../../..', 'scripts');
}

/**
 * @param {object} lineData
 * @param {{ oldid: number, force?: boolean }} options
 */
export async function runCacheWikitext(lineData, { oldid, force = false }) {
  const satellite = lineData.satellite;
  if (!satellite) {
    return { error: 'No satellite data loaded' };
  }

  const oid = Number(oldid);
  if (!Number.isFinite(oid) || oid <= 0) {
    return { error: `Invalid oldid "${oldid}": must be a positive number` };
  }

  const poll = `linea://wikitext/${oid}`;

  if (satellite.cacheStats.cached_oldids.includes(oid) && !force) {
    return { status: 'cached', oldid: oid, skipped: true, poll };
  }

  if (pendingFetches.has(oid)) {
    return { status: 'running', oldid: oid, poll };
  }

  const scriptsDir = resolveFetchScriptsDir(satellite);
  const python = process.env.LINEA_PYTHON || 'python';
  const args = ['fetch_snapshot.py', '--oldid', String(oid)];
  if (force) args.push('--force');

  pendingFetches.set(oid, true);

  return new Promise((resolve) => {
    let settled = false;
    const finishStart = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const child = spawn(python, args, {
      cwd: scriptsDir,
      stdio: 'ignore',
      detached: true
    });

    child.on('error', (err) => {
      pendingFetches.delete(oid);
      finishStart({
        status: 'error',
        oldid: oid,
        error: `Failed to spawn fetch_snapshot.py: ${err.message}`,
        hint: `Check LINEA_PYTHON (${python}) and scripts at ${scriptsDir}`
      });
    });

    child.on('exit', async (code) => {
      pendingFetches.delete(oid);
      if (code === 0) {
        try {
          await rescanSatelliteCache(satellite);
        } catch (err) {
          console.warn(`[cache_wikitext] rescan failed for oldid ${oid}:`, err.message);
        }
      } else {
        console.warn(`[cache_wikitext] fetch_snapshot.py exited ${code} for oldid ${oid}`);
      }
    });

    child.unref();
    finishStart({ status: 'started', oldid: oid, poll });
  });
}
