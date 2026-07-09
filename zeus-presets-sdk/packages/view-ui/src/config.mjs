/**
 * Configuration manager for @zeus/view-ui.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ZEUS_DISCOVERY, resolveLineasBasePath } from '@zeus/presets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const packageDir = path.resolve(__dirname, '..');
const configFilePath = path.join(__dirname, 'config.json');

const DEFAULT_VIEWERS = {
  handlers: [
    { match: 'basename', value: 'fetch-priority-viaje1.json', viewer: 'anchors-explorer' },
    { match: 'basename', value: 'wave-a-anchors.json', viewer: 'anchors-explorer' },
    { match: 'ext', value: '.json', viewer: 'object-explorer' },
    { match: 'ext', value: '.md', viewer: 'markdown-preview' },
    { match: 'ext', value: '.wikitext', viewer: 'text-plain' },
    { match: 'fallback', viewer: 'text-plain' }
  ]
};

const DEFAULT_CONFIG = {
  server: {
    port: 3015,
    host: 'localhost'
  },
  theme: {
    current: 'Black-White-MCP'
  },
  discovery: {
    urls: [...DEFAULT_ZEUS_DISCOVERY.urls],
    timeoutMs: DEFAULT_ZEUS_DISCOVERY.timeoutMs
  },
  lineas: {
    basePath: null
  },
  lineaServers: {
    espana: { tronco: 'linea-espana', satelite: 'linea-wp-historia' }
  },
  defaultLinea: 'espana',
  viewers: DEFAULT_VIEWERS,
  player: {
    host: 'localhost',
    port: 3013
  },
  editor: {
    host: 'localhost',
    port: 3012
  },
  branding: {
    title: 'Cache Explorer',
    tag: 'Zeus View · Scriptorium'
  },
  debug: false
};

if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('Default view-ui config.json created');
}

export function getConfig() {
  const configData = fs.readFileSync(configFilePath, 'utf8');
  return JSON.parse(configData);
}

export function setTheme(themeName) {
  const config = getConfig();
  config.theme.current = themeName;
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  return config;
}

export function resolveBasePath(config = getConfig()) {
  const override = config.lineas?.basePath;
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.resolve(packageDir, override);
  }
  return resolveLineasBasePath();
}

export function resolveDataDir(config = getConfig()) {
  return path.resolve(packageDir, '../../data');
}

export function getViewersConfig(config = getConfig()) {
  return config.viewers || DEFAULT_VIEWERS;
}
