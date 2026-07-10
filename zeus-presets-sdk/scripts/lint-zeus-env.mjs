#!/usr/bin/env node
/**
 * Lint Zeus env usage: canonical ZEUS_* in approved modules only; no legacy env reads.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_SRC = path.join(REPO_ROOT, 'packages');

const ALLOWED_ZEUS_ENV = new Set([
  path.join(REPO_ROOT, 'packages/presets-sdk/src/zeus-env.mjs'),
  path.join(REPO_ROOT, 'packages/presets-sdk/src/load-zeus-env.mjs'),
  path.join(REPO_ROOT, 'packages/presets-sdk/src/volumes.mjs')
]);

const ZEUS_KNOWN_PORTS = /\b(3012|3013|3014|3015|3016|3008|4101|4102|4103|4111|4112)\b/;

const EXEMPT_PORT_FILES = new Set([
  path.join(REPO_ROOT, 'packages/presets-sdk/src/discovery-config.mjs'),
  path.join(REPO_ROOT, 'packages/app-shell/src/create-app-config.mjs'),
  path.join(REPO_ROOT, 'packages/solar-system/src/bodies.mjs'),
  path.join(REPO_ROOT, 'packages/linea-system/src/lineas.mjs'),
  path.join(REPO_ROOT, 'packages/linea-firehose/src/config.mjs'),
  path.join(REPO_ROOT, 'packages/player-ui-debug/src/config.mjs')
]);

const LEGACY_PATTERNS = [
  /\blegacy\b/i,
  /\bLEGACY\b/,
  /\bdeprecated\b/i,
  /FIREHOSE_MCP_HOST/,
  /FIREHOSE_MCP_PORT/,
  /PLAYER_DEBUG_MCP_PORT/,
  /PLAYER_UI_URL/,
  /LINEAS_LEGACY_SOURCE/,
  /(?<!ZEUS_)FIREHOSE_REMOTE_PATH/
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test' || entry.name === 'node_modules') continue;
      walk(full, files);
    } else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

const issues = [];

for (const file of walk(PACKAGES_SRC)) {
  const rel = path.relative(REPO_ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  if (/process\.env\.ZEUS_/.test(content) && !ALLOWED_ZEUS_ENV.has(file)) {
    issues.push(`${rel}: direct process.env.ZEUS_* (use @zeus/presets-sdk zeus-env helpers)`);
  }

  const codeOnly = stripComments(content);
  for (const pattern of LEGACY_PATTERNS) {
    if (pattern.test(codeOnly)) {
      issues.push(`${rel}: legacy identifier (${pattern})`);
      break;
    }
  }

  if (ZEUS_KNOWN_PORTS.test(content) && !EXEMPT_PORT_FILES.has(file) && !file.includes('/test/')) {
    if (!/DEFAULT_|APP_DEFAULTS|TEST_PORT|defaultPort|fallback|3012|comment/i.test(content)) {
      if (/port:\s*(3012|3013|3014|3015|3016|3008|4101|4102|4103|4111|4112)/.test(content)) {
        issues.push(`${rel}: hardcoded Zeus port literal (use zeus-env resolution)`);
      }
    }
  }
}

if (issues.length) {
  console.error('lint:env failed:\n' + issues.map((i) => `  - ${i}`).join('\n'));
  process.exit(1);
}

console.log('lint:env OK');
