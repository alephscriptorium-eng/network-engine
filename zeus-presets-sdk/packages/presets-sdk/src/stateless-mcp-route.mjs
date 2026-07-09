/**
 * Shared Express route for stateless Streamable HTTP MCP.
 * Reuses one persistent McpServer; each POST gets an ephemeral transport.
 * Requests are serialized per server (SDK allows one active transport per McpServer).
 */

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

function createMutex() {
  let tail = Promise.resolve();
  return async (fn) => {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}

function methodNotAllowed(_req, res) {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed in stateless mode' },
    id: null
  });
}

/**
 * @param {import('express').Express} app
 * @param {{ mcpServer: import('@modelcontextprotocol/sdk/server/mcp.js').McpServer, path?: string, logLabel?: string }} options
 */
export function mountMCPRoute(app, { mcpServer, path = '/mcp', logLabel = 'mcp' }) {
  const withLock = createMutex();

  app.post(path, async (req, res) => {
    await withLock(async () => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
      let cleaned = false;
      const cleanup = async () => {
        if (cleaned) return;
        cleaned = true;
        await transport.close().catch(() => {});
        await mcpServer.close().catch(() => {});
      };
      try {
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (err) {
        console.error(`[${logLabel}] Error handling MCP request:`, err);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null
          });
        }
      } finally {
        await cleanup();
      }
    });
  });

  app.get(path, methodNotAllowed);
  app.delete(path, methodNotAllowed);
}

/**
 * Returns a start() function that binds the Express app to a port and manages MCP shutdown.
 * @param {import('express').Express} app
 * @param {{ name: string, port: number, mcpServer: import('@modelcontextprotocol/sdk/server/mcp.js').McpServer, path?: string }} options
 */
export function createMcpHttpStart(app, { name, port, mcpServer, path = '/mcp' }) {
  return () =>
    new Promise((resolve, reject) => {
      const httpServer = app.listen(port, () => {
        resolve({
          name,
          port,
          url: `http://localhost:${port}${path}`,
          close: () =>
            new Promise((res2) => {
              mcpServer.close().catch(() => {});
              if (!httpServer.listening) {
                res2();
                return;
              }
              httpServer.close((err) => {
                if (err?.code === 'ERR_SERVER_NOT_RUNNING') {
                  res2();
                  return;
                }
                res2();
              });
            })
        });
      });
      httpServer.on('error', reject);
    });
}
