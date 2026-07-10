/**
 * Shared smoke-test helpers for Zeus MCP packages.
 */

import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Connect an MCP client to a server URL or port.
 * @param {string|number} urlOrPort - full URL, base URL, or port number
 */
export async function connectMcp(urlOrPort) {
  let url;
  if (typeof urlOrPort === 'number') {
    url = `http://localhost:${urlOrPort}/mcp`;
  } else if (urlOrPort.endsWith('/mcp')) {
    url = urlOrPort;
  } else {
    url = `${urlOrPort.replace(/\/$/, '')}/mcp`;
  }

  const client = new Client({ name: 'zeus-smoke-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);
  return client;
}

/**
 * Parse JSON text from an MCP tool result.
 * @param {object} result
 */
export function toolResultJson(result) {
  assert.equal(result.content[0].type, 'text');
  return JSON.parse(result.content[0].text);
}

/**
 * Start servers, run optional callback, then close handles and clients.
 *
 * @param {() => Promise<Array<{ close?: () => Promise<void> }>>} startFn
 * @param {{
 *   onStarted?: (handles: Array) => Promise<void>,
 *   clients?: Array<{ close?: () => Promise<void> }>
 * }} [options]
 */
export async function startAllWithShutdown(startFn, options = {}) {
  const clients = options.clients || [];
  let handles = [];

  try {
    handles = await startFn();
    if (options.onStarted) {
      await options.onStarted(handles);
    }
    return handles;
  } finally {
    await Promise.allSettled(clients.map((c) => c.close?.()));
    await Promise.allSettled(handles.map((h) => h.close?.()));
  }
}
