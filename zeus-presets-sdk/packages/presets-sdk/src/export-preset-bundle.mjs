import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { countPresetItems } from './preset-store.mjs';

/**
 * Produce a filesystem-safe slug from a preset name.
 */
export function sanitizeSlug(name) {
  return String(name || 'preset')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'preset';
}

/**
 * Build bundle manifest metadata for future import support.
 */
export function buildManifest(preset) {
  return {
    format: 'zeus-preset-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    presetName: preset.name,
    presetId: preset.id,
    itemsCount: countPresetItems(preset.items)
  };
}

/**
 * Build a human-readable README for the exported bundle.
 */
export function buildReadme(preset) {
  const counts = countPresetItems(preset.items);
  const lines = [
    `# ${preset.name}`,
    '',
    preset.description ? `> ${preset.description}` : '_No description provided._',
    '',
    `- **Category:** ${preset.category || 'General'}`,
    `- **Items:** ${counts.total} (${counts.tools} tools, ${counts.resources} resources, ${counts.prompts} prompts)`,
    ''
  ];

  if (preset.prompt) {
    lines.push('## Prompt', '', '```', preset.prompt, '```', '');
  }

  if (Array.isArray(preset.items) && preset.items.length > 0) {
    lines.push('## Items', '', '| Server | Type | Name |', '|--------|------|------|');
    for (const item of preset.items) {
      lines.push(`| ${item.serverName} | ${item.type} | ${item.name} |`);
    }
  } else {
    lines.push('## Items', '', '_No items selected._');
  }

  return lines.join('\n');
}

function toPresetJson(preset) {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description || '',
    category: preset.category || 'General',
    prompt: preset.prompt || '',
    items: Array.isArray(preset.items) ? preset.items : [],
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt
  };
}

/**
 * Export a preset as a ZIP bundle stream.
 * @returns {{ filename: string, stream: import('node:stream').PassThrough }}
 */
export function exportPresetBundle(preset) {
  const slug = sanitizeSlug(preset.name);
  const folder = slug;
  const filename = `${slug}.preset.zip`;

  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  archive.append(JSON.stringify(toPresetJson(preset), null, 2), { name: `${folder}/preset.json` });
  archive.append(JSON.stringify(buildManifest(preset), null, 2), { name: `${folder}/manifest.json` });
  archive.append(buildReadme(preset), { name: `${folder}/README.md` });

  archive.finalize();

  return { filename, stream };
}
