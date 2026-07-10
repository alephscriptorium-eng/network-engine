/**
 * Canonical Zeus workspace registry: package roles + ports.
 * Merge order: defaults → data/zeus-discovery.json → process.env (ZEUS_*).
 */

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ZEUS_DISCOVERY, DEFAULT_ZEUS_MCP, DEFAULT_ZEUS_UI_MESH } from './discovery-config.mjs';
import { loadZeusEnv } from './load-zeus-env.mjs';
import {
  envPort,
  mcpToUrls,
  MCP_PORT_ENV,
  readEnvPort,
  resolveZeusHost,
  setNested,
  UI_PORT_ENV
} from './zeus-env.mjs';
import {
  buildShortcuts,
  buildStartScriptIndex,
  listWorkflowTasks,
  resolvePackageActions
} from './zeus-tasks.mjs';

const DISCOVERY_FILENAME = 'zeus-discovery.json';

export { DEFAULT_ZEUS_MCP };

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function applyEnvPortOverrides(registry) {
  const host = resolveZeusHost(registry.host || 'localhost');
  registry.host = host;

  for (const [uiId, envKey] of Object.entries(UI_PORT_ENV)) {
    if (!registry.uis[uiId]) continue;
    registry.uis[uiId].host = host;
    registry.uis[uiId].port = envPort(envKey, registry.uis[uiId].port);
  }

  for (const [mcpPath, envKey] of Object.entries(MCP_PORT_ENV)) {
    const parts = mcpPath.split('.');
    const group = registry.mcp[parts[0]];
    if (!group) continue;
    const current = group[parts[1]];
    setNested(registry.mcp, mcpPath, readEnvPort(envKey, current));
  }

  return registry;
}

/**
 * @param {string} [repoRoot] — zeus-presets-sdk root; defaults to cwd.
 */
export function loadZeusRegistry(repoRoot = process.cwd()) {
  loadZeusEnv(repoRoot);

  const dataDir = path.join(repoRoot, 'data');
  const file = readJson(path.join(dataDir, DISCOVERY_FILENAME));

  const registry = {
    host: file.host || 'localhost',
    timeoutMs: file.timeoutMs ?? DEFAULT_ZEUS_DISCOVERY.timeoutMs,
    mcp: { ...DEFAULT_ZEUS_MCP, ...file.mcp },
    uis: { ...DEFAULT_ZEUS_UI_MESH, ...file.uis },
    envFile: path.join(repoRoot, '.env')
  };

  applyEnvPortOverrides(registry);
  registry.urls = mcpToUrls(registry.host, registry.mcp);
  return registry;
}

function formatPortList(ports) {
  const nums = ports.filter((p) => typeof p === 'number').sort((a, b) => a - b);
  if (!nums.length) return '';
  if (nums.length === 1) return String(nums[0]);
  const contiguous = nums.every((p, i) => i === 0 || p === nums[i - 1] + 1);
  if (contiguous && nums.length > 2) return `${nums[0]}-${nums[nums.length - 1]}`;
  return nums.join(', ');
}

/**
 * @param {{ role?: string, ui?: string, mcp?: string }} zeus
 * @param {ReturnType<typeof loadZeusRegistry>} registry
 */
export function resolvePackagePorts(zeus = {}, registry) {
  if (zeus.role === 'app' && zeus.ui && registry.uis[zeus.ui]?.port) {
    return String(registry.uis[zeus.ui].port);
  }
  if (zeus.role === 'mcp' && zeus.mcp && registry.mcp[zeus.mcp]) {
    return formatPortList(Object.values(registry.mcp[zeus.mcp]));
  }
  return '';
}

/**
 * @param {string} packagesDir
 * @param {ReturnType<typeof loadZeusRegistry>} registry
 */
export function scanWorkspacePackages(packagesDir, registry) {
  if (!fs.existsSync(packagesDir)) return [];

  return fs
    .readdirSync(packagesDir)
    .filter((dir) => fs.existsSync(path.join(packagesDir, dir, 'package.json')))
    .map((dir) => {
      const pkg = readJson(path.join(packagesDir, dir, 'package.json'));
      const zeus = pkg.zeus || {};
      return {
        dir,
        name: pkg.name || `@zeus/${dir}`,
        role: zeus.role || 'lib',
        ports: resolvePackagePorts(zeus, registry),
        zeusDeps: Object.keys(pkg.dependencies || {}).filter((d) => d.startsWith('@zeus/'))
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {ReturnType<typeof loadZeusRegistry>} registry
 */
export function listUiLaunchers(registry) {
  return Object.entries(registry.uis).map(([id, ui]) => {
    const host = ui.host || registry.host;
    const port = ui.port;
    const p = ui.path || '/';
    const url = ui.url
      ? String(ui.url).replace(/\/$/, '') + (p === '/' ? '/' : p)
      : `http://${host}:${port}${p === '/' ? '/' : p}`;
    return { id, label: ui.label || id, url };
  });
}

export function buildCanvasSnapshot(repoRoot) {
  const registry = loadZeusRegistry(repoRoot);
  const startIndex = buildStartScriptIndex(repoRoot);
  const packages = scanWorkspacePackages(path.join(repoRoot, 'packages'), registry).map((p) => ({
    ...p,
    actions: resolvePackageActions(p, startIndex)
  }));

  return {
    generatedAt: new Date().toISOString(),
    packages,
    shortcuts: buildShortcuts(registry, packages),
    tips: {
      dev: [],
      ops: [
        {
          kind: 'openFile',
          label: 'Edit Environment Variables',
          path: '.env',
          detail: '.env'
        },
        {
          kind: 'command',
          label: 'Canvas regenerate',
          command: 'npm run canvas:generate',
          detail: 'scripts/generate-sprint0-canvas.mjs'
        },
        ...listWorkflowTasks()
      ]
    },
    envFile: '.env'
  };
}
