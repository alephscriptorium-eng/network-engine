/**
 * Intersect a catalog server entry with a preset's selected items.
 * Used by player-ui deck filters; available for editor preset preview.
 */

const CATALOG_KEYS = {
  tool: 'tools',
  resource: 'resources',
  resourceTemplate: 'resourceTemplates',
  prompt: 'prompts'
};

/**
 * @param {object|null} serverEntry - Catalog entry from ServerRegistry.buildCatalog()
 * @param {object|null|undefined} preset - Preset with { items: [{ serverName, type, name }] }
 * @returns {object|null} Filtered server entry, or null when serverEntry is missing
 */
export function applyPresetFilter(serverEntry, preset) {
  if (!serverEntry) return null;
  if (!preset) {
    return { ...serverEntry };
  }

  const presetItems = (preset.items || []).filter(
    item => item?.serverName === serverEntry.serverName
  );

  const namesFor = type =>
    new Set(presetItems.filter(item => item.type === type).map(item => item.name));

  const filtered = { ...serverEntry };

  for (const [type, key] of Object.entries(CATALOG_KEYS)) {
    const allowed = namesFor(type);
    filtered[key] = (serverEntry[key] || []).filter(item => allowed.has(item.name));
  }

  return filtered;
}
