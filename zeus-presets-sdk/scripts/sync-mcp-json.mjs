#!/usr/bin/env node
/**
 * Regenerate or verify .cursor/mcp.json and .vscode/mcp.json from .env + zeus-registry.
 * Usage:
 *   node scripts/sync-mcp-json.mjs
 *   node scripts/sync-mcp-json.mjs --check
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadZeusEnv } from '../packages/presets-sdk/src/load-zeus-env.mjs';
import { loadZeusRegistry } from '../packages/presets-sdk/src/zeus-registry.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

const MCP_SERVER_MAP = [
  { id: 'sun-mcp-server', group: 'solar', key: 'sun' },
  { id: 'moon-mcp-server', group: 'solar', key: 'moon' },
  { id: 'earth-mcp-server', group: 'solar', key: 'earth' },
  { id: 'linea-espana-mcp-server', group: 'lineas', key: 'espana' },
  { id: 'linea-wp-historia-mcp-server', group: 'lineas', key: 'wpHistoria' },
  { id: 'player-ui-debug-mcp-server', group: 'playerDebug', key: 'monitor' },
  { id: 'firehose-mcp-server', group: 'firehose', key: 'disk' }
];

const OUTPUT_PATHS = [
  path.join(REPO_ROOT, '.cursor', 'mcp.json'),
  path.join(REPO_ROOT, '.vscode', 'mcp.json')
];

function buildMcpJson(registry) {
  const host = registry.host;
  const mcpServers = {};
  for (const entry of MCP_SERVER_MAP) {
    const port = registry.mcp[entry.group]?.[entry.key];
    if (port == null) continue;
    mcpServers[entry.id] = { url: `http://${host}:${port}/mcp` };
  }
  return { mcpServers };
}

function normalizeJson(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

loadZeusEnv(REPO_ROOT);
const registry = loadZeusRegistry(REPO_ROOT);
const generated = buildMcpJson(registry);
const payload = normalizeJson(generated);

let failed = false;
for (const outPath of OUTPUT_PATHS) {
  if (CHECK_ONLY) {
    if (!fs.existsSync(outPath)) {
      console.error(`Missing ${path.relative(REPO_ROOT, outPath)}`);
      failed = true;
      continue;
    }
    const current = fs.readFileSync(outPath, 'utf8');
    if (current !== payload) {
      console.error(`Out of sync: ${path.relative(REPO_ROOT, outPath)}`);
      failed = true;
    } else {
      console.log(`OK: ${path.relative(REPO_ROOT, outPath)}`);
    }
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, payload);
    console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
  }
}

if (failed) {
  console.error('Run: npm run env:sync-mcp');
  process.exit(1);
}
