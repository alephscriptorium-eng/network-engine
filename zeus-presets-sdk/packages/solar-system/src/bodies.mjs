/**
 * Static configuration for the three celestial body servers.
 * Each config is self-contained: the moon duplicates Earth's orbital
 * constants so its server never has to call the earth server.
 */

export const SERVER_VERSION = '1.0.0';

export const bodies = {
  sun: {
    name: 'sun',
    type: 'star',
    port: 4101,
    orbitRadiusAU: 0,
    orbitalPeriodDays: null,
    rotationPeriodDays: 25.4,
    radiusKm: 696340,
    massKg: 1.989e30,
    description:
      'The star at the center of the solar system. Fixed at the origin of the reference frame; all other positions are expressed relative to it.'
  },
  moon: {
    name: 'moon',
    type: 'natural satellite',
    port: 4102,
    orbitRadiusAU: 0.00257,
    orbitalPeriodDays: 27.32,
    rotationPeriodDays: 27.32,
    radiusKm: 1737.4,
    massKg: 7.342e22,
    // Duplicated Earth constants: absolute position = Earth's orbital
    // position + the Moon's offset, computed locally for independence.
    parent: {
      name: 'earth',
      orbitRadiusAU: 1.0,
      orbitalPeriodDays: 365.25
    },
    description:
      "Earth's only natural satellite. Tidally locked: its rotation period equals its orbital period. Position is reported in absolute heliocentric coordinates (Earth position + lunar offset)."
  },
  earth: {
    name: 'earth',
    type: 'planet',
    port: 4103,
    orbitRadiusAU: 1.0,
    orbitalPeriodDays: 365.25,
    rotationPeriodDays: 1.0,
    radiusKm: 6371,
    massKg: 5.972e24,
    description:
      'The third planet from the sun. Orbits at 1 AU with a period of 365.25 days and rotates once per day.'
  }
};

export function getBody(name) {
  const body = bodies[name];
  if (!body) {
    throw new Error(`Unknown body "${name}". Expected one of: ${Object.keys(bodies).join(', ')}`);
  }
  return body;
}
