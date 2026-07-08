#!/usr/bin/env node
/**
 * Seed ALEPH et OMEGA preset pack into data/presets.json (idempotent by name).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PresetStore } from '../packages/presets-sdk/src/preset-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data');

const ALEPH_PRESETS = [
  {
    name: 'aleph-tronco-puro',
    description: 'Plato A — tesis Villacañas P01–P24',
    category: 'ALEPH et OMEGA',
    prompt: 'Composer/Reader: resuelve nodo y parte en el año del playhead.',
    items: [
      { serverName: 'linea-espana', type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: 'linea-espana', type: 'resourceTemplate', name: 'linea-parte' },
      { serverName: 'linea-espana', type: 'prompt', name: 'report-nodo' },
      { serverName: 'linea-espana', type: 'prompt', name: 'timeline-nodos' },
      { serverName: 'linea-espana', type: 'tool', name: 'get_nodo' },
      { serverName: 'linea-espana', type: 'resource', name: 'linea-info' }
    ]
  },
  {
    name: 'aleph-wp-snapshots',
    description: 'Plato B — snapshots WP medibles (oldid + wikitext)',
    category: 'ALEPH et OMEGA',
    prompt: 'Composer: resuelve oldid y wikitext para MCS. Si not cached, negociar viaje.',
    items: [
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-oldid' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-wikitext' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_nodo' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_oldid' }
    ]
  },
  {
    name: 'aleph-wp-bridge',
    description: 'Plato B — puente temático nodo→registros WP + wikitext on select',
    category: 'ALEPH et OMEGA',
    prompt: 'Composer: lista registros temáticos del nodo activo; wikitext al seleccionar oldid.',
    items: [
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-registros-year' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-registros-nodo' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-wikitext' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-registro' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_nodo' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_registros_for_year' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_registros_for_nodo' },
      { serverName: 'linea-wp-historia', type: 'prompt', name: 'report-registros-nodo' }
    ]
  },
  {
    name: 'aleph-wp-cache',
    description: 'Plato B — bridge + cache on-demand (cache_wikitext tool)',
    category: 'ALEPH et OMEGA',
    prompt: 'Composer: registros temáticos + wikitext; si not cached, invoca cache_wikitext y poll.',
    items: [
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-registros-year' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-registros-nodo' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-wikitext' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-registro' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_nodo' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_registros_for_year' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_registros_for_nodo' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'cache_wikitext' },
      { serverName: 'linea-wp-historia', type: 'prompt', name: 'report-registros-nodo' }
    ]
  },
  {
    name: 'aleph-viaje-wave-a',
    description: 'Plato B — viaje caché wave A (stats + wikitext anclas P01–P24)',
    category: 'ALEPH et OMEGA',
    prompt: 'Composer: declara cobertura, propone viaje. MCP READ-ONLY — fetch vía Python.',
    items: [
      { serverName: 'linea-wp-historia', type: 'resource', name: 'linea-cache-stats' },
      { serverName: 'linea-wp-historia', type: 'resource', name: 'linea-info' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-oldid' },
      { serverName: 'linea-wp-historia', type: 'resourceTemplate', name: 'linea-wikitext' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_nodo' },
      { serverName: 'linea-wp-historia', type: 'tool', name: 'get_oldid' },
      { serverName: 'linea-wp-historia', type: 'prompt', name: 'cache-status' },
      { serverName: 'linea-wp-historia', type: 'prompt', name: 'propose-viaje' }
    ]
  },
  {
    name: 'aleph-reader-divulgacion',
    description: 'Reader — timeline y reportes sin wikitext ni fetch',
    category: 'ALEPH et OMEGA',
    prompt: 'Reader: divulgación con epistem-tags. No cribar/commit ni fetch.',
    items: [
      { serverName: 'linea-espana', type: 'prompt', name: 'timeline-nodos' },
      { serverName: 'linea-espana', type: 'prompt', name: 'report-nodo' },
      { serverName: 'linea-espana', type: 'prompt', name: 'report-parte' },
      { serverName: 'linea-espana', type: 'resourceTemplate', name: 'linea-nodo' },
      { serverName: 'linea-wp-historia', type: 'prompt', name: 'timeline-nodos' },
      { serverName: 'linea-wp-historia', type: 'prompt', name: 'report-nodo' },
      { serverName: 'linea-wp-historia', type: 'resource', name: 'linea-cache-stats' }
    ]
  }
];

const store = new PresetStore({ dataDir });
let created = 0;
let skipped = 0;

for (const preset of ALEPH_PRESETS) {
  const existing = store.getByName(preset.name);
  if (existing) {
    store.update(existing.id, {
      description: preset.description,
      category: preset.category,
      prompt: preset.prompt,
      items: preset.items
    });
    console.log(`updated: ${preset.name} (id ${existing.id})`);
    skipped++;
    continue;
  }
  const result = store.create(preset);
  console.log(`created: ${result.name} (id ${result.id})`);
  created++;
}

console.log(`\nALEPH presets: ${created} created, ${skipped} updated/skipped, ${store.count()} total in ${dataDir}`);
