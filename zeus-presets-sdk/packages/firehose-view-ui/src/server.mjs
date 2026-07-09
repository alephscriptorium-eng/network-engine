#!/usr/bin/env node

/**
 * @zeus/firehose-view-ui server.
 * Express + firehose volume browse API + micropost preview.
 */

import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { assetsDir as uiKitAssetsDir, createThemeRoutes } from '@zeus/ui-kit';
import { resolveVolume } from '@zeus/presets-sdk';

import {
  getConfig,
  packageDir
} from './config.mjs';
import { ThemeHandler } from './theme-handler.mjs';
import {
  listCorpora,
  browseCorpus,
  readCorpusFile,
  listPosts,
  getFirehoseStats,
  loadTriageManifest
} from './firehose-bridge.mjs';
import { firehoseView } from './views/firehose_view.mjs';

/** @type {{ corpus: string|null, path: string|null, mode: string|null, name: string|null, summary: string|null }} */
let currentFocus = {
  corpus: null,
  path: null,
  mode: null,
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

/**
 * @param {object} [options]
 */
export async function createFirehoseServer(options = {}) {
  const config = getConfig();
  const port = options.port ?? config.server?.port ?? 3016;
  const host = options.host ?? config.server?.host ?? 'localhost';
  const themeHandler = new ThemeHandler();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/assets', express.static(uiKitAssetsDir));
  app.use('/assets', express.static(path.join(packageDir, 'assets')));
  app.use('/api', createThemeRoutes(themeHandler, getConfig, { skipConfigRoute: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'firehose-view-ui', timestamp: new Date().toISOString() });
  });

  app.get('/api/config', (_req, res) => {
    const cfg = getConfig();
    const volume = resolveVolume('firehose');
    res.json({
      theme: cfg.theme,
      discovery: cfg.discovery,
      defaultCorpus: cfg.defaultCorpus,
      branding: cfg.branding,
      volume: {
        id: volume.id,
        label: volume.label,
        absPath: volume.absPath,
        readonly: volume.readonly
      }
    });
  });

  app.get('/api/corpora', (_req, res) => {
    res.json({ corpora: listCorpora() });
  });

  app.get('/api/browse', async (req, res) => {
    const corpus = req.query.corpus;
    if (!corpus) {
      res.status(400).json({ error: 'corpus query param required' });
      return;
    }
    try {
      const result = await browseCorpus(String(corpus), req.query.path || '', {
        offset: req.query.offset,
        limit: req.query.limit
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/file', async (req, res) => {
    const corpus = req.query.corpus;
    const filePath = req.query.path;
    if (!corpus || !filePath) {
      res.status(400).json({ error: 'corpus and path query params required' });
      return;
    }
    const result = await readCorpusFile(String(corpus), String(filePath));
    if (result.error) {
      res.status(400).json(result);
      return;
    }
    setFocus({
      corpus: result.corpus,
      path: result.path,
      mode: 'raw',
      name: result.name,
      summary: `${result.kind} · ${result.size} bytes`
    });
    res.json(result);
  });

  app.get('/api/posts', async (req, res) => {
    const corpus = req.query.corpus;
    if (!corpus) {
      res.status(400).json({ error: 'corpus query param required' });
      return;
    }
    try {
      const result = await listPosts(String(corpus), req.query.path || '', {
        recursive: req.query.recursive !== 'false',
        limit: req.query.limit,
        offset: req.query.offset
      });
      setFocus({
        corpus: result.corpus,
        path: result.path,
        mode: 'preview',
        name: null,
        summary: `${result.posts.length} posts`
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/triage', async (_req, res) => {
    try {
      const manifest = await loadTriageManifest();
      res.json({ manifest });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/stats', (_req, res) => {
    try {
      const stats = getFirehoseStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/focus', (_req, res) => {
    res.json(buildFocusSnapshot());
  });

  app.get('/api/view/info', (_req, res) => {
    res.json({
      service: 'firehose-view-ui',
      port,
      corpora: listCorpora().map((c) => c.id),
      focus: buildFocusSnapshot()
    });
  });

  app.get('/', async (req, res) => {
    try {
      const cfg = getConfig();
      const themes = themeHandler.getAvailableThemes();
      const defaultCorpus = req.query.corpus || cfg.defaultCorpus || 'candidate';
      const html = firehoseView({
        defaultCorpus: String(defaultCorpus),
        themes,
        currentTheme: cfg.theme?.current
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (err) {
      console.error('Error rendering firehose view:', err);
      res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  });

  app.use((err, _req, res, _next) => {
    console.error('Firehose UI error:', err);
    res.status(500).json({ error: err.message });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(port, host, () => resolve(s));
  });

  async function close() {
    await new Promise((resolve) => server.close(resolve));
  }

  return { app, server, close, port, host, setFocus, getFocus: buildFocusSnapshot };
}

import { pathToFileURL } from 'node:url';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const handle = await createFirehoseServer();
  console.log(`Firehose UI running on http://${handle.host}:${handle.port}`);
  const vol = resolveVolume('firehose');
  console.log(`Volume: ${vol.absPath}`);

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
