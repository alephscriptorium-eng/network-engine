#!/usr/bin/env node
/**
 * Sync Firehose volume from remote pipeline (read-only source) to VOLUMES/DISK_01/FIREHOSE.
 * Usage: node scripts/volumes-sync-firehose.mjs [--verify] [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVolume } from '@zeus/presets-sdk';

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
    const entries = await fs.readdir(dir, { withFileTypes: true });
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

function buildReport({ source, dest, sourceStats, destStats, syncedAt }) {
  const match =
    sourceStats.files === destStats.files &&
    sourceStats.dirs === destStats.dirs;

  return `# FIREHOSE volume sync report

**Sync date:** ${syncedAt}
**Operator:** zeus-presets-sdk volumes:sync:firehose
**Mode:** verbatim read-only copy

## Destination (Zeus volume root)

\`\`\`
${path.relative(REPO_ROOT, dest).replace(/\\/g, '/')}
\`\`\`

| Field | Value |
|-------|-------|
| Disk slot | \`DISK_01\` |
| Volume name | \`FIREHOSE\` |
| Absolute path | \`${dest.replace(/\\/g, '/')}\` |

## Source (remote pipeline)

\`\`\`
${source.replace(/\\/g, '/')}
\`\`\`

## Verification

| Metric | Source | Destination | Match |
|--------|--------|-------------|-------|
| Files | ${sourceStats.files.toLocaleString('en')} | ${destStats.files.toLocaleString('en')} | ${match ? 'yes' : 'no'} |
| Directories | ${sourceStats.dirs.toLocaleString('en')} | ${destStats.dirs.toLocaleString('en')} | ${match ? 'yes' : 'no'} |
| Total size | ${formatBytes(sourceStats.bytes)} | ${formatBytes(destStats.bytes)} | — |

## Top-level layout

\`\`\`
FIREHOSE/
├── candidate/          # filtered posts
├── raw/                # raw stream batches
├── discarded/          # triage rejects
├── labeled/            # CDR pipeline output
└── triage-manifest.json
\`\`\`

Re-sync: \`npm run volumes:sync:firehose\`
`;
}

async function main() {
  const volume = resolveVolume('firehose');
  const source = volume.source?.remotePath;
  const dest = volume.absPath;

  if (!source) {
    throw new Error('firehose volume has no source.remotePath');
  }

  try {
    await fs.access(source);
  } catch {
    throw new Error(`Remote source not found: ${source}`);
  }

  console.log(`Source: ${source}`);
  console.log(`Dest:   ${dest}`);

  const sourceStats = await countTree(source);
  console.log(`Source: ${sourceStats.files} files, ${sourceStats.dirs} dirs, ${formatBytes(sourceStats.bytes)}`);

  if (verifyOnly) {
    let destStats = { files: 0, dirs: 0, bytes: 0 };
    try {
      await fs.access(dest);
      destStats = await countTree(dest);
    } catch {
      console.log('Destination missing or empty');
    }
    console.log(`Dest:   ${destStats.files} files, ${destStats.dirs} dirs, ${formatBytes(destStats.bytes)}`);
    const ok =
      sourceStats.files === destStats.files &&
      sourceStats.dirs === destStats.dirs;
    console.log(ok ? 'VERIFY OK' : 'VERIFY MISMATCH');
    process.exit(ok ? 0 : 1);
  }

  if (!dryRun) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.cp(source, dest, { recursive: true, force: true });
    console.log('Copy complete.');
  } else {
    console.log('Dry run — no copy performed.');
  }

  const destStats = await countTree(dest);
  const syncedAt = new Date().toISOString();
  const reportPath = path.join(path.dirname(dest), 'FIREHOSE_SYNC_REPORT.md');
  const report = buildReport({ source, dest, sourceStats, destStats, syncedAt });

  if (!dryRun) {
    await fs.writeFile(reportPath, report, 'utf8');
    console.log(`Report written: ${reportPath}`);
  }

  const ok =
    sourceStats.files === destStats.files &&
    sourceStats.dirs === destStats.dirs;
  console.log(ok ? 'SYNC OK' : 'SYNC MISMATCH');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
