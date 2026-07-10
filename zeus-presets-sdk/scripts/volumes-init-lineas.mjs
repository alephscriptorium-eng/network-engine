#!/usr/bin/env node
/**
 * LINEAS volume on DISK_02 — verify / optional import from external source.
 *
 * Default (no legacy): dest-only verify and stats on VOLUMES/DISK_02/LINEAS.
 *
 * Usage:
 *   node scripts/volumes-init-lineas.mjs [--verify]     # validate canonical tree (default action)
 *   node scripts/volumes-init-lineas.mjs --stats        # print dest metrics only
 *   node scripts/volumes-init-lineas.mjs --import       # copy from ZEUS_LINEAS_IMPORT_SOURCE env
 *   node scripts/volumes-init-lineas.mjs --dry-run      # with --import: preview only
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVolume, resetVolumesCache, loadZeusEnv } from '@zeus/presets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
loadZeusEnv(REPO_ROOT);

const args = new Set(process.argv.slice(2));
const verifyOnly = args.has('--verify') || (!args.has('--import') && !args.has('--stats'));
const dryRun = args.has('--dry-run');
const doImport = args.has('--import');
const statsOnly = args.has('--stats');

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

async function validateDest(dest) {
  const checks = [];
  const registry = path.join(dest, 'registry.yaml');
  const espanaManifest = path.join(dest, 'espana/manifest.json');

  try {
    await fs.access(registry);
    checks.push({ path: 'registry.yaml', ok: true });
  } catch {
    checks.push({ path: 'registry.yaml', ok: false });
  }

  try {
    await fs.access(espanaManifest);
    checks.push({ path: 'espana/manifest.json', ok: true });
  } catch {
    checks.push({ path: 'espana/manifest.json', ok: false });
  }

  const stats = await countTree(dest);
  const ok = checks.every((c) => c.ok) && stats.files > 0;

  return { ok, checks, stats };
}

async function copyTreeContents(source, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    await fs.cp(srcPath, destPath, { recursive: true, force: true });
    console.log(`Copied ${entry.name}/ → ${path.relative(REPO_ROOT, destPath)}`);
  }
}

function buildReport({ dest, destStats, syncedAt, mode }) {
  return `# LINEAS volume report

**Updated:** ${syncedAt}
**Operator:** zeus-presets-sdk volumes:init:lineas
**Mode:** ${mode}

## Destination (canonical)

\`\`\`
${path.relative(REPO_ROOT, dest).replace(/\\/g, '/')}
\`\`\`

| Field | Value |
|-------|-------|
| Disk slot | \`DISK_02\` |
| Volume name | \`LINEAS\` |
| Absolute path | \`${dest.replace(/\\/g, '/')}\` |

## Tree metrics

| Metric | Value |
|--------|-------|
| Files | ${destStats.files.toLocaleString('en')} |
| Directories | ${destStats.dirs.toLocaleString('en')} |
| Total size | ${formatBytes(destStats.bytes)} |

## Policy

- **DISK_02/LINEAS** is the sole canonical read root for all lineas data.
- \`resolveVolume('lineas')\` and \`resolveLineasBasePath()\` → DISK_02/LINEAS.
- Legacy \`lineas-poder\` removed **2026-07-09**; no duplicate backup on disk.
- Optional re-import: set \`ZEUS_LINEAS_IMPORT_SOURCE\` and run \`npm run volumes:init:lineas -- --import\`.

Verify: \`npm run volumes:init:lineas -- --verify\`
`;
}

async function main() {
  resetVolumesCache();
  const volume = resolveVolume('lineas');
  const dest = volume.absPath;

  console.log(`Dest: ${dest}`);

  if (doImport) {
    const source = process.env.ZEUS_LINEAS_IMPORT_SOURCE;
    if (!source) {
      throw new Error(
        'ZEUS_LINEAS_IMPORT_SOURCE env required for --import (absolute path to external lineas tree)'
      );
    }
    try {
      await fs.access(source);
    } catch {
      throw new Error(`Import source not found: ${source}`);
    }

    console.log(`Source: ${source}`);
    if (!dryRun) {
      await copyTreeContents(source, dest);
      console.log('Import complete.');
    } else {
      console.log('Dry run — no copy performed.');
    }
  }

  const { ok, checks, stats } = await validateDest(dest);

  console.log(
    `Dest tree: ${stats.files} files, ${stats.dirs} dirs, ${formatBytes(stats.bytes)}`
  );
  for (const c of checks) {
    console.log(`  ${c.ok ? 'OK' : 'MISSING'} ${c.path}`);
  }

  if (statsOnly) {
    process.exit(ok ? 0 : 1);
  }

  if (verifyOnly || doImport) {
    console.log(ok ? 'VERIFY OK' : 'VERIFY FAILED');
    if (!dryRun && doImport) {
      const reportPath = path.join(path.dirname(dest), 'LINEAS_SYNC_REPORT.md');
      const report = buildReport({
        dest,
        destStats: stats,
        syncedAt: new Date().toISOString(),
        mode: doImport ? 'import from ZEUS_LINEAS_IMPORT_SOURCE' : 'dest-only verify'
      });
      await fs.writeFile(reportPath, report, 'utf8');
      console.log(`Report written: ${reportPath}`);
    }
    process.exit(ok ? 0 : 1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
