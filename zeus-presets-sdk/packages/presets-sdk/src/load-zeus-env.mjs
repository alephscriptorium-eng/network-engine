/**
 * Idempotent loader for the monorepo root .env file.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
export const MONOREPO_ROOT = join(PACKAGE_ROOT, '../..');

let _loaded = false;

/**
 * Load .env from zeus-presets-sdk root once per process.
 * @param {string} [repoRoot] — override monorepo root (tests).
 */
export function loadZeusEnv(repoRoot = MONOREPO_ROOT) {
  if (_loaded) return;
  _loaded = true;
  const envPath = join(repoRoot, '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

/**
 * Reset loader state (tests only).
 */
export function resetZeusEnvLoader() {
  _loaded = false;
}
