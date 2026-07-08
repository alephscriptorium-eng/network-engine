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
      let closed = false;
      const cleanup = async () => {
        if (closed) return;
        closed = true;
        await transport.close().catch(() => {});
        await mcpServer.close().catch(() => {});
      };
      res.on('close', () => {
        cleanup().catch(() => {});
      });
      try {
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (err) {
        console.error(`[${logLabel}] Error handling MCP request:`, err);
        await cleanup();
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null
          });
        }
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
            new Promise((res2, rej2) => {
              mcpServer.close().catch(() => {});
              httpServer.close((err) => (err ? rej2(err) : res2()));
            })
        });
      });
      httpServer.on('error', reject);
    });
}
