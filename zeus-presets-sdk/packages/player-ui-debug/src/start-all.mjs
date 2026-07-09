/**
 * Unified startup: socket+REST substrate, MCP :3014, and TOP console TUI.
 */

import { pathToFileURL } from 'node:url';
import logUpdate from 'log-update';
import { getDebugConfig } from './config.mjs';
import { createSessionClient } from './client.mjs';
import { createRestPoller } from './rest-poller.mjs';
import { createStateStore } from './state-store.mjs';
import { createServer } from './mcp-server.mjs';
import { renderFrame } from './render.mjs';

const CUE_YEARS = [450, 1350, 1808, 1978];

/**
 * @param {ReturnType<typeof getDebugConfig>} config
 */
export function createSubstrate(config) {
  const poller = createRestPoller({
    baseUrl: config.baseUrl,
    defaultCaso: config.defaultCaso,
    intervalMs: config.restPollMs
  });

  /** @type {ReturnType<typeof createStateStore>} */
  let stateStore;
  const client = createSessionClient(config.sessionUrl, {
    pushEvent: (type, payload, detail) => stateStore.recordEvent(type, payload, detail)
  });
  stateStore = createStateStore({ config, client, poller });

  return { client, poller, stateStore };
}

/**
 * @param {ReturnType<typeof createStateStore>} stateStore
 * @param {ReturnType<typeof getDebugConfig>} config
 * @param {{ client: ReturnType<typeof createSessionClient>, poller: ReturnType<typeof createRestPoller> }} substrate
 * @param {{ headless?: boolean }} [options]
 */
export function createTui(stateStore, config, substrate, options = {}) {
  const { client, poller } = substrate;
  const headless = options.headless === true;
  const onQuit = options.onQuit;
  let refreshTimer = null;
  let stdinHandler = null;
  let shuttingDown = false;

  function paint() {
    logUpdate(
      renderFrame({
        config,
        clientState: stateStore.getClientState(),
        restState: stateStore.getRestState(),
        monitorUptime: stateStore.getMonitorUptime()
      })
    );
  }

  function onKey(key) {
    const ch = key.toString();
    if (ch === '\u0003' || ch === 'q' || ch === 'Q') {
      if (onQuit) onQuit();
      else close();
      return;
    }
    if (ch === 'r' || ch === 'R') {
      client.reconnect();
      poller.pollOnce();
      return;
    }
    if (ch === 'p' || ch === 'P') {
      client.pauseTransport();
      return;
    }
    const idx = Number(ch) - 1;
    if (idx >= 0 && idx < CUE_YEARS.length) {
      client.setPlayhead(CUE_YEARS[idx]);
    }
  }

  function start() {
    client.connect();
    poller.start();

    if (!headless) {
      const refreshMs = Math.round(1000 / config.refreshHz);
      refreshTimer = setInterval(paint, refreshMs);
      stateStore.onUpdate(paint);
      paint();

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        stdinHandler = onKey;
        process.stdin.on('data', stdinHandler);
      }
    }
  }

  function close() {
    if (shuttingDown) return;
    shuttingDown = true;

    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (stdinHandler && process.stdin.isTTY) {
      process.stdin.off('data', stdinHandler);
      process.stdin.setRawMode(false);
    }

    poller.stop();
    client.disconnect();

    if (!headless) {
      logUpdate.clear();
      logUpdate.done();
    }
  }

  return { start, close, paint };
}

/**
 * Starts substrate, MCP server, and TUI. Returns unified close().
 * @param {Partial<ReturnType<typeof getDebugConfig>> & { headless?: boolean }} [options]
 */
export async function startAll(options = {}) {
  const { headless = false, ...configOverrides } = options;
  const config = getDebugConfig(configOverrides);
  const substrate = createSubstrate(config);

  let mcpHandle = null;
  let tuiHandle = null;

  try {
    mcpHandle = await createServer(substrate.stateStore, config, substrate).start();

    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      tuiHandle?.close();
      await mcpHandle?.close?.();
    };

    tuiHandle = createTui(substrate.stateStore, config, substrate, {
      headless,
      onQuit: () => close().then(() => process.exit(0))
    });
    tuiHandle.start();

    if (!headless) {
      console.log(
        `[${mcpHandle.name}] MCP at ${mcpHandle.url} (health: ${mcpHandle.url.replace(/\/mcp$/, '/mcp/health')})`
      );
      console.log(`[${mcpHandle.name}] TUI monitor → ${config.sessionUrl}`);
    }

    return {
      config,
      substrate,
      stateStore: substrate.stateStore,
      mcp: mcpHandle,
      tui: tuiHandle,
      close
    };
  } catch (err) {
    tuiHandle?.close();
    await mcpHandle?.close?.();
    throw err;
  }
}

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
