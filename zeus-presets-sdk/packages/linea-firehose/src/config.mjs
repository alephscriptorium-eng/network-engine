/**
 * Firehose MCP server configuration.
 */

import { readEnvPort, resolveZeusHost } from '@zeus/presets-sdk';

export const SERVER_NAME = 'firehose-mcp-server';
export const SERVER_VERSION = '0.1.0';
export const DEFAULT_PORT = 3008;

export function getServerConfig() {
  const port = readEnvPort('ZEUS_MCP_FIREHOSE', DEFAULT_PORT);
  return {
    name: SERVER_NAME,
    port,
    host: resolveZeusHost()
  };
}
