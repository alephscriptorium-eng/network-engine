#!/usr/bin/env node
/**
 * Initialize LINEAS volume on DISK_02 — copy cache trees from lineas-poder source.
 * Usage: node scripts/volumes-init-lineas.mjs [--verify] [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveVolume,
  resolveLineasSourceRoot,
  resetVolumesCache
} from '@zeus/presets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const verifyOnly = args.has('--verify');
const dryRun = args.has('--dry-run');

async function countTree(root) {
  let files = 0;
  let dirs = 0;
  let bytes = 0;

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        dirs += 1;
        await walk(full);
      } else if (entry.isFile()) {
        files += 1;
        const stat = await fs.stat(full);
        bytes += stat.size;
      }
    }
  }

  await walk(root);
  return { files, dirs, bytes };
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Discover cache directories under source (directories named "cache").
 */
async function discoverCacheDirs(sourceRoot) {
  const cacheDirs = [];

  async function walk(dir, rel = '') {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const childAbs = path.join(dir, entry.name);
      if (entry.name === 'cache') {
        cacheDirs.push({ rel: childRel, abs: childAbs });
      } else {
        await walk(childAbs, childRel);
      }
    }
  }

  await walk(sourceRoot);
  return cacheDirs;
}

function buildReport({ source, dest, cacheDirs, sourceStats, destStats, syncedAt }) {
  const match =
    sourceStats.files === destStats.files &&
    sourceStats.dirs === destStats.dirs;

  const cacheList = cacheDirs.length
    ? cacheDirs.map((d) => `- \`${d.rel}/\``).join('\n')
    : '- _(none found)_';

  return `# LINEAS volume init report

**Sync date:** ${syncedAt}
**Operator:** zeus-presets-sdk volumes:init:lineas
**Mode:** cache-only copy (hybrid — manifests remain at source)

## Destination (Zeus volume root)

\`\`\`
${path.relative(REPO_ROOT, dest).replace(/\\/g, '/')}
\`\`\`

| Field | Value |
|-------|-------|
| Disk slot | \`DISK_02\` |
| Volume name | \`LINEAS\` |
| Absolute path | \`${dest.replace(/\\/g, '/')}\` |

## Source (registry + manifests)

\`\`\`
${source.replace(/\\/g, '/')}
\`\`\`

## Cache directories migrated

${cacheList}

## Verification

| Metric | Source cache | Destination | Match |
|--------|--------------|-------------|-------|
| Files | ${sourceStats.files.toLocaleString('en')} | ${destStats.files.toLocaleString('en')} | ${match ? 'yes' : 'no'} |
| Directories | ${sourceStats.dirs.toLocaleString('en')} | ${destStats.dirs.toLocaleString('en')} | ${match ? 'yes' : 'no'} |
| Total size | ${formatBytes(sourceStats.bytes)} | ${formatBytes(destStats.bytes)} | — |

## Hybrid policy

- **DISK_02/LINEAS** holds \`*/cache/**\` trees (wikitext snapshots, viajes, audits).
- **lineas-poder** remains canonical for \`registry.yaml\`, manifests, nodos, and fetch scripts.
- \`resolveVolume('lineas')\` → DISK_02; \`resolveLineasSourceRoot()\` → lineas-poder.

Re-init: \`npm run volumes:init:lineas\`
`;
}

async function aggregateCacheStats(cacheDirs) {
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  for (const dir of cacheDirs) {
    const stats = await countTree(dir.abs);
    files += stats.files;
    dirs += stats.dirs;
    bytes += stats.bytes;
  }
  return { files, dirs, bytes };
}

async function aggregateDestCacheStats(destRoot, cacheDirs) {
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  for (const dir of cacheDirs) {
    const destPath = path.join(destRoot, dir.rel);
    try {
      await fs.access(destPath);
    } catch {
      continue;
    }
    const stats = await countTree(destPath);
    files += stats.files;
    dirs += stats.dirs;
    bytes += stats.bytes;
  }
  return { files, dirs, bytes };
}

async function main() {
  resetVolumesCache();
  const volume = resolveVolume('lineas');
  const source = resolveLineasSourceRoot();
  const dest = volume.absPath;

  try {
    await fs.access(source);
  } catch {
    throw new Error(`Source not found: ${source}`);
  }

  console.log(`Source: ${source}`);
  console.log(`Dest:   ${dest}`);

  const cacheDirs = await discoverCacheDirs(source);
  if (cacheDirs.length === 0) {
    console.log('No cache directories found under source.');
  } else {
    console.log(`Cache dirs: ${cacheDirs.map((d) => d.rel).join(', ')}`);
  }

  const sourceStats = await aggregateCacheStats(cacheDirs);
  console.log(
    `Source cache: ${sourceStats.files} files, ${sourceStats.dirs} dirs, ${formatBytes(sourceStats.bytes)}`
  );

  if (verifyOnly) {
    const destStats = await aggregateDestCacheStats(dest, cacheDirs);
    console.log(
      `Dest cache:   ${destStats.files} files, ${destStats.dirs} dirs, ${formatBytes(destStats.bytes)}`
    );
    const ok =
      sourceStats.files === destStats.files &&
      sourceStats.dirs === destStats.dirs;
    console.log(ok ? 'VERIFY OK' : 'VERIFY MISMATCH');
    process.exit(ok ? 0 : 1);
  }

  if (!dryRun) {
    for (const dir of cacheDirs) {
      const target = path.join(dest, dir.rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.cp(dir.abs, target, { recursive: true, force: true });
      console.log(`Copied ${dir.rel}/ → ${path.relative(REPO_ROOT, target)}`);
    }
    if (cacheDirs.length === 0) {
      await fs.mkdir(dest, { recursive: true });
    }
    console.log('Copy complete.');
  } else {
    console.log('Dry run — no copy performed.');
  }

  const destStats = await aggregateDestCacheStats(dest, cacheDirs);
  const syncedAt = new Date().toISOString();
  const reportPath = path.join(path.dirname(dest), 'LINEAS_SYNC_REPORT.md');
  const report = buildReport({ source, dest, cacheDirs, sourceStats, destStats, syncedAt });

  if (!dryRun) {
    await fs.writeFile(reportPath, report, 'utf8');
    console.log(`Report written: ${reportPath}`);
  }

  const ok =
    sourceStats.files === destStats.files &&
    sourceStats.dirs === destStats.dirs;
  console.log(ok ? 'INIT OK' : 'INIT MISMATCH');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
