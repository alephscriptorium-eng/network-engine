/**
 * Configuration manager for @zeus/player-ui.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ZEUS_DISCOVERY } from '@zeus/presets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const packageDir = path.resolve(__dirname, '..');
const configFilePath = path.join(__dirname, 'config.json');

const DEFAULT_CONFIG = {
  server: {
    port: 3013,
    host: 'localhost'
  },
  theme: {
    current: 'Black-White-MCP'
  },
  discovery: {
    urls: [...DEFAULT_ZEUS_DISCOVERY.urls],
    timeoutMs: DEFAULT_ZEUS_DISCOVERY.timeoutMs
  },
  presets: {
    dataDir: '../../data',
    library: 'default',
    autoLoad: true
  },
  editor: {
    host: 'localhost',
    port: 3012
  },
  view: {
    host: 'localhost',
    port: 3015
  },
  deck: {
    defaultYear: 2010,
    troncoRange: { min: 450, max: 2026 },
    parteCues: [
      { id: 'I', year: 450 },
      { id: 'II', year: 1350 },
      { id: 'III', year: 1808 },
      { id: 'IV', year: 1978 }
    ]
  },
  aleph: {
    defaultPresets: { A: 'aleph-tronco-puro', B: 'aleph-wp-cache' },
    defaultCaso: 'aeo-p24-linea',
    casos: ['aeo-p24-linea', 'aeo-tronco-caso1', 'aeo-caso2-2026'],
    theme: 'Scriptorium-Skins',
    branding: {
      title: 'Tablero ALEPH',
      tag: 'Animus Iocandi · Scriptorium Skins'
    }
  },
  debug: false,
  debugMonitor: {
    enabled: true,
    baseUrl: 'http://localhost:3014'
  }
};

if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('Default player config.json created');
}

export function getConfig() {
  const configData = fs.readFileSync(configFilePath, 'utf8');
  return JSON.parse(configData);
}

export function setTheme(themeName) {
  const config = getConfig();
  config.theme.current = themeName;
  if (config.aleph) {
    config.aleph.theme = themeName;
  }
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  return config;
}

export function resolveDataDir(config = getConfig()) {
  const dataDir = config.presets?.dataDir || DEFAULT_CONFIG.presets.dataDir;
  return path.resolve(packageDir, dataDir);
}
