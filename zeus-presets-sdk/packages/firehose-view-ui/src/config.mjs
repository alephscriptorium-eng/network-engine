/**
 * Configuration manager for @zeus/firehose-view-ui.
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
    port: 3016,
    host: 'localhost'
  },
  theme: {
    current: 'Black-White-MCP'
  },
  discovery: {
    urls: [...DEFAULT_ZEUS_DISCOVERY.urls],
    timeoutMs: DEFAULT_ZEUS_DISCOVERY.timeoutMs
  },
  defaultCorpus: 'candidate',
  branding: {
    title: 'Firehose Explorer',
    tag: 'Zeus Firehose · Scriptorium'
  },
  debug: false
};

if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log('Default firehose-view-ui config.json created');
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

export function resolveDataDir(config = getConfig()) {
  return path.resolve(packageDir, '../../data');
}
