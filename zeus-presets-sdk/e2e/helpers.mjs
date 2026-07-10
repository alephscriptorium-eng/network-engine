/**
 * Shared helpers for zeus-presets-sdk e2e scripts.
 */

import { loadZeusEnv, resolveLineasBasePath } from '@zeus/presets-sdk';

loadZeusEnv();
export const lineasBasePath = resolveLineasBasePath();

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function waitForEvent(socket, event, predicate = null, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeoutMs
    );
    const handler = (payload) => {
      if (predicate && !predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

/** Close an MCP/HTTP server handle without throwing if already stopped. */
export async function safeClose(handle) {
  if (!handle?.close) return;
  try {
    await handle.close();
  } catch (err) {
    if (err?.code !== 'ERR_SERVER_NOT_RUNNING') throw err;
  }
}

/** Shut down all started linea handles and the player server. */
export async function shutdownE2E({ lineaHandles = [], player = null, sockets = [] } = {}) {
  for (const socket of sockets) {
    try {
      socket.disconnect();
    } catch {
      /* best effort */
    }
  }
  if (player) await safeClose(player);
  await Promise.allSettled((lineaHandles || []).map((h) => safeClose(h)));
}
