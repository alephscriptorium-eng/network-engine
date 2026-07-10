#!/usr/bin/env node
/**
 * Medidor casos on DISK_02/LINEAS/espana/etiquetados — verify / optional import.
 *
 * Usage:
 *   node scripts/volumes-init-medidor.mjs [--verify]     # validate casos tree (default)
 *   node scripts/volumes-init-medidor.mjs --stats        # print dest metrics only
 *   node scripts/volumes-init-medidor.mjs --import       # copy from ZEUS_MEDIDOR_IMPORT_SOURCE
 *   node scripts/volumes-init-medidor.mjs --dry-run      # with --import: preview only
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveMedidorCasosPath, resetVolumesCache, loadZeusEnv } from '@zeus/presets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
loadZeusEnv(REPO_ROOT);

const TABLERO_CASOS = ['aeo-p24-linea', 'aeo-tronco-caso1', 'aeo-caso2-2026'];

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

  for (const casoId of TABLERO_CASOS) {
    const estadoPath = path.join(dest, casoId, 'estado.json');
    try {
      await fs.access(estadoPath);
      checks.push({ path: `${casoId}/estado.json`, ok: true });
    } catch {
      checks.push({ path: `${casoId}/estado.json`, ok: false });
    }
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
  return `# Medidor casos report

**Updated:** ${syncedAt}
**Operator:** zeus-presets-sdk volumes:init:medidor
**Mode:** ${mode}

## Destination (canonical)

\`\`\`
${path.relative(REPO_ROOT, dest).replace(/\\/g, '/')}
\`\`\`

| Field | Value |
|-------|-------|
| Volume | \`lineas\` |
| Line instance | \`espana/etiquetados\` |
| Absolute path | \`${dest.replace(/\\/g, '/')}\` |

## Tree metrics

| Metric | Value |
|--------|-------|
| Files | ${destStats.files.toLocaleString('en')} |
| Directories | ${destStats.dirs.toLocaleString('en')} |
| Total size | ${formatBytes(destStats.bytes)} |

## Policy

- Medidor **casos** (estado.json, cribados, prensa) live under \`DISK_02/LINEAS/espana/etiquetados/\`.
- \`resolveMedidorCasosPath()\` → canonical read root for Tablero crossover.
- Medidor **motor** (CLI, FOSS docs) remains in external \`medidor-poder-politico\` repo.
- Optional re-import: set \`ZEUS_MEDIDOR_IMPORT_SOURCE\` and run \`npm run volumes:init:medidor -- --import\`.

Verify: \`npm run volumes:init:medidor -- --verify\`
`;
}

async function main() {
  resetVolumesCache();
  const dest = resolveMedidorCasosPath('espana');

  console.log(`Dest: ${dest}`);

  if (doImport) {
    const source = process.env.ZEUS_MEDIDOR_IMPORT_SOURCE;
    if (!source) {
      throw new Error(
        'ZEUS_MEDIDOR_IMPORT_SOURCE env required for --import (absolute path to medidor data/casos tree)'
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
      const reportPath = path.join(dest, 'MEDIDOR_SYNC_REPORT.md');
      const report = buildReport({
        dest,
        destStats: stats,
        syncedAt: new Date().toISOString(),
        mode: doImport ? 'import from ZEUS_MEDIDOR_IMPORT_SOURCE' : 'dest-only verify'
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
