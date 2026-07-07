/**
 * Static configuration for the two linea MCP servers.
 */

export const SERVER_VERSION = '1.0.0';

export const TRONCO_COVERAGE = { min: 450, max: 2026 };
export const SATELITE_COVERAGE = { min: 2001, max: 2026 };

export const lineaServers = {
  espana: {
    name: 'linea-espana',
    kind: 'tronco',
    port: 4111,
    lineaId: 'espana',
    coverage: TRONCO_COVERAGE
  },
  wpHistoria: {
    name: 'linea-wp-historia',
    kind: 'satelite',
    port: 4112,
    lineaId: 'espana',
    coverage: SATELITE_COVERAGE
  }
};

export function getLineaServer(key) {
  const server = lineaServers[key];
  if (!server) {
    throw new Error(
      `Unknown linea server "${key}". Expected one of: ${Object.keys(lineaServers).join(', ')}`
    );
  }
  return server;
}
