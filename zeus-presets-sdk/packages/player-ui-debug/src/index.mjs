#!/usr/bin/env node

/**
 * @zeus/player-ui-debug — entry point: startAll() → substrate + MCP :3014 + TUI.
 */

import { pathToFileURL } from 'node:url';
import { startAll } from './start-all.mjs';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const handle = await startAll();
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down player-ui-debug...`);
    await handle.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
