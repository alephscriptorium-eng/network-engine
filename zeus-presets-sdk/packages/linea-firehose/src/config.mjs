/**
 * Firehose MCP server configuration.
 */

export const SERVER_NAME = 'firehose-mcp-server';
export const SERVER_VERSION = '0.1.0';
export const DEFAULT_PORT = 3008;

export function getServerConfig() {
  const port = Number(process.env.FIREHOSE_MCP_PORT) || DEFAULT_PORT;
  return {
    name: SERVER_NAME,
    port,
    host: process.env.FIREHOSE_MCP_HOST || 'localhost'
  };
}
