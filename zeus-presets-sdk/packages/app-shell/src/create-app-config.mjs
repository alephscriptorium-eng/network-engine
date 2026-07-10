/**
 * Shared app config factory for Zeus UI packages.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveDiscoverySources,
  resolveLineasBasePath,
  loadZeusEnv,
  resolveAppPort,
  resolveZeusHost,
  resolveZeusUiPorts
} from '@zeus/presets-sdk';

const VOLATILE_CONFIG_KEYS = ['server', 'discovery', 'player', 'editor', 'view', 'debugMonitor'];

const APP_DEFAULTS = {
  editor: {
    port: 3012,
    theme: 'Black-White-MCP',
    features: { presetLibrary: true, mcpExplorer: true, themeSystem: true },
    presets: { dataDir: '../../data', library: 'default', autoLoad: true },
    ui: { language: 'en', animations: true, darkMode: false },
    player: { host: 'localhost', port: 3013 },
    view: { host: 'localhost', port: 3015 },
    debug: false
  },
  player: {
    port: 3013,
    theme: 'Scriptorium-Skins',
    presets: { dataDir: '../../data', library: 'default', autoLoad: true },
    editor: { host: 'localhost', port: 3012 },
    view: { host: 'localhost', port: 3015 },
    deck: {
      defaultYear: 2010,
      troncoRange: { min: 450, max: 2026 },
      parteCues: [
        { id: 'I', year: 450 },
        { id: 'II', year: 1350 },
        { id: 'III', year: 1808 },
        { id: 'IV', year: 1978 }
      ],
      defaultFirehosePreset: 'aleph-firehose-browse',
      firehoseDefaultCorpus: 'candidate'
    },
    aleph: {
      defaultPresets: { A: 'aleph-tronco-puro', B: 'aleph-wp-cache', C: 'aleph-firehose-browse' },
      defaultCaso: 'aeo-p24-linea',
      casos: ['aeo-p24-linea', 'aeo-tronco-caso1', 'aeo-caso2-2026'],
      theme: 'Scriptorium-Skins',
      branding: { title: 'Tablero ALEPH', tag: 'Scriptorium · Zeus SDK' }
    },
    debug: false,
    debugMonitor: { enabled: true, baseUrl: 'http://localhost:3014' }
  },
  view: {
    port: 3015,
    theme: 'Black-White-MCP',
    lineas: { basePath: null },
    lineaServers: { espana: { tronco: 'linea-espana', satelite: 'linea-wp-historia' } },
    defaultLinea: 'espana',
    viewers: {
      handlers: [
        { match: 'basename', value: 'fetch-priority-viaje1.json', viewer: 'anchors-explorer' },
        { match: 'basename', value: 'wave-a-anchors.json', viewer: 'anchors-explorer' },
        { match: 'ext', value: '.json', viewer: 'object-explorer' },
        { match: 'ext', value: '.md', viewer: 'markdown-preview' },
        { match: 'ext', value: '.wikitext', viewer: 'text-plain' },
        { match: 'fallback', viewer: 'text-plain' }
      ]
    },
    player: { host: 'localhost', port: 3013 },
    editor: { host: 'localhost', port: 3012 },
    branding: { title: 'Cache Explorer', tag: 'Scriptorium · Zeus SDK' },
    debug: false
  },
  firehose: {
    port: 3016,
    theme: 'Black-White-MCP',
    defaultCorpus: 'candidate',
    branding: { title: 'Firehose Explorer', tag: 'Scriptorium · Zeus SDK' },
    debug: false
  },
  debug: {
    port: 3014,
    theme: 'Black-White-MCP',
    debug: true
  }
};

/**
 * Strip env-derived fields before persisting config.json to disk.
 * @param {object} config
 */
export function stripVolatileConfig(config) {
  const local = structuredClone(config);
  for (const key of VOLATILE_CONFIG_KEYS) {
    delete local[key];
  }
  return local;
}

/**
 * Merge .env-derived server, discovery and cross-app refs over file config.
 * @param {object} fileConfig
 * @param {object} ctx
 * @param {string} ctx.appId
 * @param {string} ctx.packageDir
 * @param {object} ctx.appBase
 * @param {number} [ctx.defaultPort]
 */
export function resolveRuntimeConfig(fileConfig, { appId, packageDir, appBase, defaultPort }) {
  loadZeusEnv();
  const host = resolveZeusHost();
  const uis = resolveZeusUiPorts();
  const runtime = structuredClone(fileConfig);

  runtime.server = {
    ...(fileConfig.server || {}),
    host,
    port: resolveAppPort(appId, defaultPort ?? appBase.port ?? fileConfig.server?.port ?? 3000)
  };

  runtime.discovery = {
    ...resolveDiscoverySources({
      dataDir: path.join(packageDir, fileConfig.presets?.dataDir || appBase.presets?.dataDir || '../../data'),
      localDiscovery: fileConfig.discovery || {}
    })
  };

  if (fileConfig.player || appBase.player) {
    runtime.player = { ...(fileConfig.player || {}), host, port: uis.player.port };
  }
  if (fileConfig.editor || appBase.editor) {
    runtime.editor = { ...(fileConfig.editor || {}), host, port: uis.editor.port };
  }
  if (fileConfig.view || appBase.view) {
    runtime.view = { ...(fileConfig.view || {}), host, port: uis.view.port };
  }
  if (fileConfig.debugMonitor?.enabled || appBase.debugMonitor?.enabled) {
    runtime.debugMonitor = {
      ...(fileConfig.debugMonitor || appBase.debugMonitor || {}),
      baseUrl: `http://${host}:${resolveAppPort('debug', 3014)}`
    };
  }

  return runtime;
}

/**
 * @param {object} options
 * @param {string} options.appId - editor | player | view | firehose | debug
 * @param {number} [options.defaultPort]
 * @param {object} [options.features]
 * @param {object} [options.extraDefaults]
 * @param {string} options.importMetaUrl - import.meta.url from the app config.mjs
 * @param {string} [options.configFileName='config.json']
 */
export function createAppConfig(options) {
  const {
    appId,
    defaultPort,
    features = {},
    extraDefaults = {},
    configFileName = 'config.json',
    importMetaUrl,
    skipConfigFile = false
  } = options;

  if (!importMetaUrl) {
    throw new Error('createAppConfig requires importMetaUrl (pass import.meta.url from app config.mjs)');
  }

  const callerDir = path.dirname(fileURLToPath(importMetaUrl));
  const packageDir = path.resolve(callerDir, '..');
  const configFilePath = path.join(callerDir, configFileName);

  const appBase = APP_DEFAULTS[appId] || {};
  const { port: _ignoredPort, theme: themeName, features: baseFeatures, ...restApp } = appBase;

  const runtimeCtx = { appId, packageDir, appBase, defaultPort };
  const baseFileConfig = {
    theme: { current: themeName || 'Black-White-MCP' },
    features: { ...baseFeatures, ...features },
    ...structuredClone(restApp),
    ...extraDefaults
  };

  const DEFAULT_CONFIG = resolveRuntimeConfig(baseFileConfig, runtimeCtx);

  if (!skipConfigFile && !fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(stripVolatileConfig(baseFileConfig), null, 2));
    console.log(`Default ${appId} config.json created`);
  }

  function readFileConfig() {
    if (skipConfigFile) {
      return structuredClone(baseFileConfig);
    }
    try {
      const configData = fs.readFileSync(configFilePath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error reading config:', error);
      throw error;
    }
  }

  function persistFileConfig(fileConfig) {
    if (skipConfigFile) return;
    fs.writeFileSync(configFilePath, JSON.stringify(stripVolatileConfig(fileConfig), null, 2));
  }

  function getAppConfig() {
    return resolveRuntimeConfig(readFileConfig(), runtimeCtx);
  }

  function updateConfig(newConfig) {
    const fileConfig = readFileConfig();
    const merged = { ...fileConfig, ...newConfig };
    persistFileConfig(merged);
    return resolveRuntimeConfig(merged, runtimeCtx);
  }

  function setTheme(themeName) {
    const fileConfig = readFileConfig();
    fileConfig.theme = fileConfig.theme || {};
    fileConfig.theme.current = themeName;
    if (fileConfig.aleph) fileConfig.aleph.theme = themeName;
    persistFileConfig(fileConfig);
    return resolveRuntimeConfig(fileConfig, runtimeCtx);
  }

  function updateSection(section, updates) {
    const fileConfig = readFileConfig();
    if (!Object.prototype.hasOwnProperty.call(fileConfig, section)) {
      throw new Error(`Configuration section '${section}' does not exist`);
    }
    fileConfig[section] = { ...fileConfig[section], ...updates };
    persistFileConfig(fileConfig);
    return resolveRuntimeConfig(fileConfig, runtimeCtx);
  }

  function getSectionDefaults(section) {
    return DEFAULT_CONFIG[section] || {};
  }

  function resolveDataDir(config = getAppConfig()) {
    const dataDir = config.presets?.dataDir || DEFAULT_CONFIG.presets?.dataDir || '../../data';
    return path.resolve(packageDir, dataDir);
  }

  function resolveBasePath(config = getAppConfig()) {
    const override = config.lineas?.basePath;
    if (override) {
      return path.isAbsolute(override) ? override : path.resolve(packageDir, override);
    }
    return resolveLineasBasePath();
  }

  function getViewersConfig(config = getAppConfig()) {
    return config.viewers || DEFAULT_CONFIG.viewers || { handlers: [] };
  }

  return {
    packageDir,
    getAppConfig,
    getConfig: getAppConfig,
    updateConfig,
    setTheme,
    updateSection,
    getSectionDefaults,
    resolveDataDir,
    resolveBasePath,
    getViewersConfig
  };
}
