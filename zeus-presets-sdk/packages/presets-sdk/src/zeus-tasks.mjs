/**
 * VS Code task catalog derived from zeus-registry + root package.json scripts.
 * Labels align with .vscode/tasks.json; ports come from .env via registry.
 */

import fs from 'node:fs';
import path from 'node:path';

/** dir → task suffix used in tasks.json labels (when different from dir). */
const TASK_SUFFIX = {
  'player-ui': 'player-ui (DJ)',
  'linea-firehose': 'firehose-mcp',
  'linea-system': 'lineas'
};

const ZEUS_TASK_BUNDLES = [
  {
    label: 'Start ▸ ALL',
    kind: 'bundle',
    taskLabels: [
      'Start ▸ lineas',
      'Start ▸ editor-ui',
      'Start ▸ player-ui (DJ)',
      'Start ▸ view-ui',
      'Start ▸ firehose-mcp',
      'Start ▸ firehose-view-ui',
      'Start ▸ player-ui-debug'
    ]
  },
  {
    label: 'Start ▸ Cache Explorer',
    kind: 'bundle',
    taskLabels: ['Start ▸ lineas', 'Start ▸ view-ui']
  },
  {
    label: 'Start ▸ Firehose Explorer',
    kind: 'bundle',
    taskLabels: ['Start ▸ firehose-mcp', 'Start ▸ firehose-view-ui']
  },
  {
    label: 'Start ▸ Tablero ALEPH',
    kind: 'sequence',
    steps: ['Seed ▸ aleph presets', 'Start ▸ Tablero servidores']
  },
  {
    label: 'Start ▸ Tablero servidores',
    kind: 'bundle',
    taskLabels: ['Start ▸ lineas', 'Start ▸ player-ui (DJ)', 'Start ▸ player-ui-debug']
  },
  {
    label: 'Stop ■ ALL (kill all ports)',
    kind: 'stopAll'
  }
];

const WORKFLOW_TASKS = [
  { label: 'Seed ▸ aleph presets', command: 'npm run seed:aleph' },
  { label: 'Test ✓ smoke solar-system', command: 'npm run test:solar' },
  { label: 'Test ✓ smoke lineas', command: 'npm run test:lineas' },
  { label: 'Test ✓ smoke firehose-mcp', command: 'npm run test:firehose-mcp' },
  { label: 'Test ✓ player-ui-debug smoke', command: 'npm run test:player-debug' },
  { label: 'Test ✓ e2e catalog demo', command: 'npm run e2e' },
  { label: 'Test ✓ e2e deck demo', command: 'npm run e2e:deck' },
  { label: 'Test ✓ e2e tablero aleph', command: 'npm run e2e:tablero' },
  { label: 'Test ✓ e2e view-ui', command: 'npm run e2e:view' },
  { label: 'Test ✓ e2e firehose', command: 'npm run e2e:firehose' },
  { label: 'Test ✓ e2e firehose-links', command: 'npm run e2e:firehose-links' },
  { label: 'lint:env', command: 'npm run lint:env' },
  { label: 'env:sync-mcp', command: 'npm run env:sync-mcp' }
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function taskSuffix(dir) {
  return TASK_SUFFIX[dir] || dir;
}

function startLabel(dir) {
  return `Start ▸ ${taskSuffix(dir)}`;
}

function stopLabel(dir) {
  return `Stop ■ ${taskSuffix(dir)}`;
}

/**
 * @param {string} portsStr — e.g. "3012", "4111, 4112", "4101-4103"
 * @returns {number[]}
 */
export function parsePortsList(portsStr) {
  if (!portsStr) return [];
  const nums = [];
  for (const part of String(portsStr).split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map((n) => Number(n.trim()));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let p = a; p <= b; p++) nums.push(p);
      }
    } else {
      const n = Number(trimmed);
      if (Number.isFinite(n)) nums.push(n);
    }
  }
  return [...new Set(nums)].sort((a, b) => a - b);
}

/**
 * @param {ReturnType<import('./zeus-registry.mjs').loadZeusRegistry>} registry
 */
export function collectZeusPorts(registry) {
  const ports = new Set();
  for (const ui of Object.values(registry.uis || {})) {
    if (ui?.port) ports.add(ui.port);
  }
  for (const group of Object.values(registry.mcp || {})) {
    for (const port of Object.values(group)) {
      if (typeof port === 'number') ports.add(port);
    }
  }
  return [...ports].sort((a, b) => a - b);
}

/**
 * @param {string} repoRoot
 * @returns {Map<string, string>} package name → start script key (e.g. start:editor)
 */
export function buildStartScriptIndex(repoRoot) {
  const root = readJson(path.join(repoRoot, 'package.json'));
  const index = new Map();
  for (const [key, value] of Object.entries(root.scripts || {})) {
    if (!key.startsWith('start:') || key === 'start:all') continue;
    const match = String(value).match(/-w\s+(@zeus\/[^\s]+)/);
    if (match) index.set(match[1], key);
  }
  return index;
}

function buildStopCommand(dir, ports) {
  const portArgs = ports.join(' ');
  return `npm run stop:ports -- "${taskSuffix(dir)} stopped" ${portArgs}`;
}

/**
 * @param {{ dir: string, role: string, ports: string }} pkg
 * @param {Map<string, string>} startIndex
 */
export function resolvePackageActions(pkg, startIndex) {
  if (pkg.role !== 'app' && pkg.role !== 'mcp') return null;

  const scriptKey = startIndex.get(pkg.name);
  if (!scriptKey) return null;

  const ports = parsePortsList(pkg.ports);
  if (!ports.length) return null;

  return {
    startLabel: startLabel(pkg.dir),
    stopLabel: stopLabel(pkg.dir),
    startCommand: `npm run ${scriptKey}`,
    stopCommand: buildStopCommand(pkg.dir, ports)
  };
}

/**
 * @param {ReturnType<import('./zeus-registry.mjs').loadZeusRegistry>} registry
 * @param {Array<{ dir: string, role: string, ports: string, actions?: object | null }>} packages
 * @param {string} repoRoot
 */
export function buildShortcuts(registry, packages) {
  const allPorts = collectZeusPorts(registry);

  const ui = Object.entries(registry.uis).map(([id, uiEntry]) => {
    const host = uiEntry.host || registry.host;
    const port = uiEntry.port;
    const p = uiEntry.path || '/';
    const url = uiEntry.url
      ? String(uiEntry.url).replace(/\/$/, '') + (p === '/' ? '/' : p)
      : `http://${host}:${port}${p === '/' ? '/' : p}`;
    return { id, label: uiEntry.label || id, url };
  });

  const mcp = packages
    .filter((p) => p.role === 'mcp' && p.actions)
    .map((p) => ({
      id: p.dir,
      label: taskSuffix(p.dir),
      ports: p.ports,
      startLabel: p.actions.startLabel,
      stopLabel: p.actions.stopLabel
    }));

  return {
    ui,
    bundles: ZEUS_TASK_BUNDLES.map((b) =>
      b.kind === 'stopAll'
        ? { ...b, stopCommand: buildStopCommand('all', allPorts) }
        : b
    ),
    mcp
  };
}

export function listWorkflowTasks() {
  return WORKFLOW_TASKS.map((t) => ({ ...t, kind: 'command' }));
}
