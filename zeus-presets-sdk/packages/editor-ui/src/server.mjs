#!/usr/bin/env node

/**
 * @zeus/editor-ui server.
 * Ported from zeus/server/ZeusServer.js (CJS -> ESM). Differences from the
 * original:
 *   - No AI/stats pages, no WebSocket handler.
 *   - mcpHandler/presetHandler replaced by in-process @zeus/presets-sdk
 *     (PresetStore + ServerRegistry + discoverServers).
 *   - The SDK HTTP routes (createPresetRoutes) are mounted as well, so
 *     external clients get the /api/mcp/list|set|presets contract.
 */

import path from 'node:path';
import express from 'express';
import cors from 'cors';
import {
  ServerRegistry,
  PresetStore,
  syncDiscoveredServers,
  resolveDiscoverySources,
  createPresetRoutes,
  createCatalogService
} from '@zeus/presets-sdk';
import { assetsDir as uiKitAssetsDir } from '@zeus/ui-kit';

import { getConfig, resolveDataDir, getSectionDefaults, packageDir } from './config.mjs';
import { ThemeHandler } from './theme-handler.mjs';
import { createApiRoutes, enrichPreset, CATEGORIES } from './api-routes.mjs';
import { homeView } from './views/home_view.mjs';
import { presetView } from './views/preset_view.mjs';
import { editorView } from './views/editor_view.mjs';
import { settingsView } from './views/settings_view.mjs';

// Configuration
const config = getConfig();

// SDK wiring: the store is the single source of truth for presets, the
// registry provides the live MCP catalog.
const dataDir = resolveDataDir(config);
const store = new PresetStore({ dataDir });
const registry = new ServerRegistry();
const catalog = createCatalogService({ registry });
const themeHandler = new ThemeHandler();

console.log(`Preset store: ${dataDir} (${store.count()} preset(s) loaded)`);

async function refreshDiscovery() {
  const cfg = getConfig();
  const sources = resolveDiscoverySources({
    dataDir,
    localDiscovery: cfg.discovery
  });
  try {
    const result = await syncDiscoveredServers(registry, sources, {
      catalog,
      pruneStale: false,
      registerMode: 'strict'
    });
    console.log(
      `Discovery complete: ${result.found.length} server(s) found, ${result.registered.length} registered`
    );
    return result;
  } catch (error) {
    console.error('Discovery failed:', error.message);
    throw error;
  }
}

refreshDiscovery().catch(() => {});

// Initialize Express app
const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Shared ui-kit assets first, then editor-specific assets (override on collision)
app.use('/assets', express.static(uiKitAssetsDir));
app.use('/assets', express.static(path.join(packageDir, 'assets')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'editor-ui',
    timestamp: new Date().toISOString()
  });
});

// Main route handler - Home page
app.get('/', async (req, res) => {
  try {
    const htmlResponse = homeView();
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse.outerHTML);
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send(errorPage('Home', error));
  }
});

// Presets Library route
app.get('/presets', async (req, res) => {
  try {
    const servers = await catalog.getAllServers();
    const enrichedPresets = store.getAll().map(preset => enrichPreset(preset, servers));

    const viewData = {
      presets: enrichedPresets,
      categories: CATEGORIES,
      pagination: {
        total: enrichedPresets.length,
        page: 1,
        limit: 20,
        totalPages: 1
      },
      filters: {},
      selectedPreset: null,
      isLoading: false,
      error: null,
      mcpServers: servers
    };

    const htmlResponse = presetView(viewData);
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse.outerHTML);
  } catch (error) {
    console.error('Error rendering presets page:', error);
    res.status(500).send(errorPage('Presets', error));
  }
});

// MCP Editor route
app.get('/editor', async (req, res) => {
  try {
    const requestedServerId = req.query.server;

    const servers = await catalog.getAllServers();
    const selectedServer =
      (requestedServerId && servers.find(server => server.id === requestedServerId)) ||
      servers.find(server => server.status === 'connected') ||
      servers[0] || null;
    let serverContent = {};

    if (selectedServer) {
      const [tools, resources, prompts] = await Promise.all([
        catalog.getServerTools(selectedServer.id),
        catalog.getServerResources(selectedServer.id),
        catalog.getServerPrompts(selectedServer.id)
      ]);

      serverContent = {
        tools: tools || [],
        resources: resources || [],
        prompts: prompts || []
      };
    }

    const editorData = {
      servers,
      selectedServer,
      serverContent,
      selectedItems: [],
      isLoading: false,
      error: null
    };

    const htmlResponse = editorView(editorData);
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse.outerHTML);
  } catch (error) {
    console.error('Error rendering editor page:', error);
    res.status(500).send(errorPage('MCP Editor', error));
  }
});

// Settings page route
app.get('/settings', async (req, res) => {
  try {
    const cfg = getConfig();

    const settings = {
      theme: cfg.theme || getSectionDefaults('theme'),
      ui: cfg.ui || getSectionDefaults('ui'),
      features: cfg.features || getSectionDefaults('features'),
      discovery: cfg.discovery || getSectionDefaults('discovery'),
      presets: cfg.presets || getSectionDefaults('presets')
    };

    const htmlResponse = settingsView(settings);
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse.outerHTML);
  } catch (error) {
    console.error('Error rendering settings page:', error);
    res.status(500).send(errorPage('Settings', error));
  }
});

// SDK HTTP routes for external clients:
// GET /api/mcp/list, POST /api/mcp/set, GET /api/mcp/presets,
// GET /api/mcp/preset/:name, DELETE /api/mcp/preset/:id
app.use(createPresetRoutes({ registry, store }));

// UI API routes (presets/mcp/config/theme/settings blocks)
app.use('/api', createApiRoutes({ store, catalog, themeHandler, refreshDiscovery }));

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Editor UI Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.debug ? err.message : 'Something went wrong'
  });
});

function errorPage(pageName, error) {
  return `
    <html>
      <head><title>${pageName} - Error</title></head>
      <body>
        <h1>Error Loading ${pageName}</h1>
        <p>Unable to load ${pageName.toLowerCase()} page: ${error.message}</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `;
}

// Start server
const port = config.server?.port || 3012;
const host = config.server?.host || 'localhost';

const server = app.listen(port, host, () => {
  console.log(`Editor UI running on http://${host}:${port}`);
  console.log(`Environment: ${config.debug ? 'development' : 'production'}`);

  if (config.debug) {
    console.log('Configuration:', JSON.stringify(config, null, 2));
  }
});

// Graceful shutdown
async function shutdown() {
  try {
    await registry.close();
  } catch (error) {
    console.error('Error closing registry:', error.message);
  }
  server.close(() => {
    console.log('Editor UI server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, server, config };
