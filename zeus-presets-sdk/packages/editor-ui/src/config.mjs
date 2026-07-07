/**
 * Configuration manager for @zeus/editor-ui.
 * Ported from zeus/configs/config-manager.js (CJS -> ESM), with the AI
 * sections removed (this build has no inference).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of the editor-ui package (packages/editor-ui). */
export const packageDir = path.resolve(__dirname, '..');

const configFilePath = path.join(__dirname, 'config.json');

const DEFAULT_CONFIG = {
  server: {
    port: 3012,
    host: 'localhost'
  },
  features: {
    presetLibrary: true,
    mcpExplorer: true,
    themeSystem: true
  },
  theme: {
    current: 'Black-White-MCP'
  },
  discovery: {
    urls: [
      'http://localhost:4101',
      'http://localhost:4102',
      'http://localhost:4103'
    ],
    timeoutMs: 2000
  },
  presets: {
    dataDir: '../../data',
    library: 'default',
    autoLoad: true
  },
  mcp: {
    servers: [],
    timeout: 30000
  },
  ui: {
    language: 'en',
    animations: true,
    darkMode: false
  },
  player: {
    host: 'localhost',
    port: 3013
  },
  debug: false
};

if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('Default config.json created');
}

export function getConfig() {
  try {
    const configData = fs.readFileSync(configFilePath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading config:', error);
    throw error;
  }
}

export function updateConfig(newConfig) {
  try {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    fs.writeFileSync(configFilePath, JSON.stringify(updatedConfig, null, 2));
    return updatedConfig;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
}

export function setTheme(themeName) {
  try {
    const config = getConfig();
    config.theme.current = themeName;
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
    return config;
  } catch (error) {
    console.error('Error setting theme:', error);
    throw error;
  }
}

export function updateSection(section, updates) {
  const config = getConfig();
  if (!Object.prototype.hasOwnProperty.call(config, section)) {
    throw new Error(`Configuration section '${section}' does not exist`);
  }
  config[section] = { ...config[section], ...updates };
  return updateConfig(config);
}

export function getSectionDefaults(section) {
  return DEFAULT_CONFIG[section] || {};
}

/**
 * Resolve the presets data directory. Relative paths in config are resolved
 * against the package root, so the default '../../data' lands at
 * <repoRoot>/data.
 */
export function resolveDataDir(config = getConfig()) {
  const dataDir = config.presets?.dataDir || DEFAULT_CONFIG.presets.dataDir;
  return path.resolve(packageDir, dataDir);
}
