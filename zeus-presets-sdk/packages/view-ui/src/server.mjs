#!/usr/bin/env node

/**
 * @zeus/view-ui server.
 * Express + browse API + double-viewer cache explorer.
 */

import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { assetsDir as uiKitAssetsDir, createThemeRoutes } from '@zeus/ui-kit';

import {
  getConfig,
  resolveBasePath,
  resolveDataDir,
  getViewersConfig,
  packageDir
} from './config.mjs';
import { ThemeHandler } from './theme-handler.mjs';
import { createMcpBridge } from './mcp-bridge.mjs';
import {
  listLineas,
  browseDirectory,
  readLineFile,
  getCacheStats,
  buildAnchorsGrid,
  resolveWikitextPath
} from './browse-bridge.mjs';
import { cacheView } from './views/cache_view.mjs';

/** @type {{ linea: string|null, path: string|null, viewer: string|null, name: string|null, summary: string|null }} */
let currentFocus = {
  linea: null,
  path: null,
  viewer: null,
  name: null,
  summary: null
};

function setFocus(payload) {
  currentFocus = { ...currentFocus, ...payload };
}

function buildFocusSnapshot() {
  return {
    schemaVersion: 1,
    at: new Date().toISOString(),
    focus: { ...currentFocus }
  };
}

function parseResourceJson(result) {
  const text = result?.contents?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * @param {object} [options]
 */
export async function createViewServer(options = {}) {
  const config = getConfig();
  const port = options.port ?? config.server?.port ?? 3015;
  const host = options.host ?? config.server?.host ?? 'localhost';
  const basePath = options.basePath ?? resolveBasePath(config);
  const dataDir = options.dataDir ?? resolveDataDir(config);
  const themeHandler = new ThemeHandler();
  const mcp = createMcpBridge({
    dataDir,
    discovery: options.discoveryUrls
      ? { ...config.discovery, urls: options.discoveryUrls }
      : config.discovery
  });

  mcp.refresh().catch(() => {});

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/assets', express.static(uiKitAssetsDir));
  app.use('/assets', express.static(path.join(packageDir, 'assets')));
  app.use('/api', createThemeRoutes(themeHandler, getConfig, { skipConfigRoute: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'view-ui', timestamp: new Date().toISOString() });
  });

  app.get('/api/config', (_req, res) => {
    const cfg = getConfig();
    res.json({
      theme: cfg.theme,
      discovery: cfg.discovery,
      defaultLinea: cfg.defaultLinea,
      viewers: getViewersConfig(cfg),
      branding: cfg.branding,
      player: cfg.player,
      editor: cfg.editor
    });
  });

  app.get('/api/lineas', async (_req, res) => {
    const result = await listLineas(basePath);
    if (result.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  app.get('/api/browse', async (req, res) => {
    const lineaId = req.query.linea;
    if (!lineaId) {
      res.status(400).json({ error: 'linea query param required' });
      return;
    }
    const result = await browseDirectory(basePath, String(lineaId), req.query.path || '', {
      offset: req.query.offset,
      limit: req.query.limit,
      handlers: getViewersConfig().handlers
    });
    if (result.error) {
      res.status(result.error.includes('unknown') ? 404 : 400).json(result);
      return;
    }
    res.json(result);
  });

  app.get('/api/file', async (req, res) => {
    const lineaId = req.query.linea;
    const filePath = req.query.path;
    if (!lineaId || !filePath) {
      res.status(400).json({ error: 'linea and path query params required' });
      return;
    }
    const result = await readLineFile(basePath, String(lineaId), String(filePath), {
      handlers: getViewersConfig().handlers
    });
    if (result.error) {
      res.status(400).json(result);
      return;
    }
    setFocus({
      linea: result.linea,
      path: result.path,
      viewer: result.viewer,
      name: result.name,
      summary: `${result.kind} · ${result.size} bytes`
    });
    res.json(result);
  });

  app.get('/api/stats', async (req, res) => {
    const lineaId = req.query.linea || getConfig().defaultLinea || 'espana';
    const cfg = getConfig();
    const lineaServers = cfg.lineaServers?.[lineaId];

    let mcpStats = null;
    if (lineaServers?.satelite) {
      const mcpResult = await mcp.fetchCacheStats(lineaServers);
      if (!mcpResult.error) {
        mcpStats = mcpResult.data;
      }
    }

    const fsResult = await getCacheStats(basePath, String(lineaId));
    if (fsResult.error && !mcpStats) {
      res.status(404).json(fsResult);
      return;
    }

    res.json({
      linea: lineaId,
      source: mcpStats ? 'mcp+filesystem' : 'filesystem',
      stats: mcpStats || fsResult.stats,
      filesystem: fsResult.stats || null,
      mcp: mcpStats
    });
  });

  app.get('/api/anchors', async (req, res) => {
    const lineaId = req.query.linea || getConfig().defaultLinea || 'espana';
    const result = await buildAnchorsGrid(basePath, String(lineaId));
    if (result.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  app.get('/api/focus', (_req, res) => {
    res.json(buildFocusSnapshot());
  });

  app.get('/api/view/info', async (_req, res) => {
    const lineas = await listLineas(basePath);
    res.json({
      service: 'view-ui',
      port,
      basePath,
      lineas: lineas.error ? [] : lineas.lineas.map((l) => l.id),
      focus: buildFocusSnapshot()
    });
  });

  app.get('/api/view/wikitext-path', (req, res) => {
    const lineaId = req.query.linea;
    const oldid = req.query.oldid;
    if (!lineaId || !oldid) {
      res.status(400).json({ error: 'linea and oldid required' });
      return;
    }
    const result = resolveWikitextPath(basePath, String(lineaId), oldid);
    if (result.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  app.get('/', async (req, res) => {
    try {
      const cfg = getConfig();
      const themes = themeHandler.getAvailableThemes();
      const defaultLinea = req.query.linea || cfg.defaultLinea || 'espana';
      const html = cacheView({
        defaultLinea: String(defaultLinea),
        themes,
        currentTheme: cfg.theme?.current
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (err) {
      console.error('Error rendering cache view:', err);
      res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  });

  app.use((err, _req, res, _next) => {
    console.error('View UI error:', err);
    res.status(500).json({ error: err.message });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(port, host, () => resolve(s));
  });

  async function close() {
    await mcp.close();
    await new Promise((resolve) => server.close(resolve));
  }

  return { app, server, close, port, host, basePath, mcp, setFocus, getFocus: buildFocusSnapshot };
}

import { pathToFileURL } from 'node:url';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const handle = await createViewServer();
  console.log(`View UI running on http://${handle.host}:${handle.port}`);
  console.log(`Lineas base: ${handle.basePath}`);

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
