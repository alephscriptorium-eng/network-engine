#!/usr/bin/env node
/**
 * Regenerate the packages table in docs/README.md between <!-- packages:auto --> markers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_README = path.join(REPO_ROOT, 'docs', 'README.md');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

const START_MARKER = '<!-- packages:auto -->';
const END_MARKER = '<!-- /packages:auto -->';

/** @type {Record<string, string[]>} */
const PACKAGE_DOCS = {
  '@zeus/presets-sdk': [
    'packages/presets-sdk/src/zeus-env.mjs',
    'docs/volumes-contract.md'
  ],
  '@zeus/app-shell': ['docs/deck-contract.md'],
  '@zeus/ui-kit': ['docs/deck-contract.md'],
  '@zeus/test-utils': [],
  '@zeus/solar-system': ['e2e/demo.mjs'],
  '@zeus/linea-system': [
    'packages/linea-system/README.md',
    'docs/cursor-mcp-lineas.md'
  ],
  '@zeus/linea-firehose': [
    'docs/firehose-contract.md',
    'docs/cursor-mcp-firehose.md'
  ],
  '@zeus/editor-ui': ['docs/deck-contract.md'],
  '@zeus/player-ui': [
    'docs/deck-contract.md',
    'docs/tablero-aleph.md',
    'packages/player-ui/MANUAL-DJ.md'
  ],
  '@zeus/player-ui-debug': [
    'packages/player-ui-debug/MANUAL-DJ.md',
    'docs/cursor-mcp-player-debug.md'
  ],
  '@zeus/view-ui': ['docs/view-contract.md', 'docs/view-ui.md'],
  '@zeus/firehose-view-ui': ['docs/firehose-contract.md']
};

const ROLE_ORDER = { lib: 0, mcp: 1, app: 2 };

/**
 * @param {string} repoPath
 */
function docLink(repoPath) {
  const fromDocs = path.relative(path.join(REPO_ROOT, 'docs'), path.join(REPO_ROOT, repoPath));
  const normalized = fromDocs.split(path.sep).join('/');
  return `[${path.basename(repoPath)}](${normalized})`;
}

function loadPackages() {
  const dirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const rows = [];
  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const role = pkg.zeus?.role ?? '—';
    const docs = (PACKAGE_DOCS[pkg.name] ?? []).map(docLink).join(', ') || '—';
    rows.push({
      role,
      name: pkg.name,
      main: pkg.main ?? '—',
      docs,
      sortRole: ROLE_ORDER[role] ?? 9,
      sortName: pkg.name
    });
  }

  rows.sort((a, b) => a.sortRole - b.sortRole || a.sortName.localeCompare(b.sortName));
  return rows;
}

function renderTable(rows) {
  const lines = [
    '| Rol | Paquete | Entrada | Documentación |',
    '|-----|---------|---------|---------------|'
  ];
  for (const row of rows) {
    lines.push(`| ${row.role} | \`${row.name}\` | \`${row.main}\` | ${row.docs} |`);
  }
  return lines.join('\n');
}

function main() {
  const readme = fs.readFileSync(DOCS_README, 'utf8');
  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end <= start) {
    console.error(`Markers not found in ${DOCS_README}`);
    process.exit(1);
  }

  const table = renderTable(loadPackages());
  const updated =
    readme.slice(0, start + START_MARKER.length) +
    '\n' +
    table +
    '\n' +
    readme.slice(end);

  fs.writeFileSync(DOCS_README, updated, 'utf8');
  console.log(`Updated packages table in docs/README.md (${loadPackages().length} packages)`);
}

main();
