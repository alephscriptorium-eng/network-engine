import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk';

const MS_PER_DAY = 86400000;
const TWO_PI = 2 * Math.PI;

function orbitalAngle(timestamp, periodDays) {
  return ((timestamp / (periodDays * MS_PER_DAY)) * TWO_PI) % TWO_PI;
}

export function computePosition(body, timestamp) {
  if (!body.orbitalPeriodDays || body.orbitRadiusAU === 0) {
    return {
      body: body.name,
      timestamp,
      angleRad: 0,
      position: { xAU: 0, yAU: 0 },
      orbitRadiusAU: body.orbitRadiusAU,
      orbitalPeriodDays: body.orbitalPeriodDays ?? null
    };
  }
  const angleRad = orbitalAngle(timestamp, body.orbitalPeriodDays);
  let xAU = body.orbitRadiusAU * Math.cos(angleRad);
  let yAU = body.orbitRadiusAU * Math.sin(angleRad);
  if (body.parent) {
    const parentAngle = orbitalAngle(timestamp, body.parent.orbitalPeriodDays);
    xAU += body.parent.orbitRadiusAU * Math.cos(parentAngle);
    yAU += body.parent.orbitRadiusAU * Math.sin(parentAngle);
  }
  return {
    body: body.name,
    timestamp,
    angleRad,
    position: { xAU, yAU },
    orbitRadiusAU: body.orbitRadiusAU,
    orbitalPeriodDays: body.orbitalPeriodDays
  };
}

export function computeRotation(body, timestamp) {
  return {
    body: body.name,
    timestamp,
    rotationAngleRad: orbitalAngle(timestamp, body.rotationPeriodDays),
    rotationPeriodDays: body.rotationPeriodDays
  };
}

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {object} body
 */
export function buildMcp(server, body) {
  const timestampInput = {
    timestamp: z
      .number()
      .optional()
      .describe('Epoch milliseconds. Defaults to Date.now(). Results are deterministic for a given timestamp.')
  };

  server.registerTool(
    'get_position',
    {
      title: `Get ${body.name} position`,
      description: `Deterministic heliocentric position of ${body.name} at a given timestamp (epoch ms). Returns orbital angle and cartesian coordinates in AU.`,
      inputSchema: timestampInput
    },
    async ({ timestamp }) => jsonContent(computePosition(body, timestamp ?? Date.now()))
  );

  server.registerTool(
    'get_rotation',
    {
      title: `Get ${body.name} rotation`,
      description: `Deterministic rotation angle of ${body.name} around its own axis at a given timestamp (epoch ms).`,
      inputSchema: timestampInput
    },
    async ({ timestamp }) => jsonContent(computeRotation(body, timestamp ?? Date.now()))
  );
}
