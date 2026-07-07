import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Validate the items array of a preset.
 * Each item must be {serverName, type: 'tool'|'resource'|'prompt', name}.
 */
export function validateSelectedItems(selectedItems) {
  const errors = [];

  if (!Array.isArray(selectedItems)) {
    errors.push('items must be an array');
    return { valid: false, errors };
  }

  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];

    if (!item || typeof item !== 'object') {
      errors.push(`Item ${i}: must be an object`);
      continue;
    }

    if (!item.serverName) {
      errors.push(`Item ${i}: serverName is required`);
    }

    if (!item.type || !['tool', 'resource', 'resourceTemplate', 'prompt'].includes(item.type)) {
      errors.push(`Item ${i}: type must be 'tool', 'resource', 'resourceTemplate', or 'prompt'`);
    }

    if (!item.name) {
      errors.push(`Item ${i}: name is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Count preset items by type.
 */
export function countPresetItems(items) {
  const counts = {
    tools: 0,
    resources: 0,
    resourceTemplates: 0,
    prompts: 0,
    total: Array.isArray(items) ? items.length : 0
  };

  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.type === 'tool') counts.tools++;
      else if (item.type === 'resource') counts.resources++;
      else if (item.type === 'resourceTemplate') counts.resourceTemplates++;
      else if (item.type === 'prompt') counts.prompts++;
    }
  }

  return counts;
}

/**
 * JSON-file-backed preset store with the unified rich schema:
 * { id, name, description, category, prompt, items, createdAt, updatedAt }
 *
 * Persists synchronously on every mutation. dataDir is injectable
 * (no process.cwd() coupling).
 */
export class PresetStore {
  constructor({ dataDir, fileName = 'presets.json' } = {}) {
    if (!dataDir) {
      throw new Error('PresetStore requires a dataDir');
    }

    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, fileName);
    this.presets = [];

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw.trim()) return;

      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.presets) ? data.presets : []);
      this.presets = arr.filter(p => p && p.id && p.name);
    } catch (error) {
      console.warn(`PresetStore: could not load presets from ${this.filePath}:`, error.message);
      this.presets = [];
    }
  }

  save() {
    const payload = { version: 2, presets: this.presets };
    fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  getAll() {
    return this.presets;
  }

  getById(id) {
    return this.presets.find(preset => preset.id === id) || null;
  }

  getByName(name) {
    return this.presets.find(preset => preset.name === name) || null;
  }

  /**
   * Create a preset. Throws Error (with .details: string[]) on validation failure.
   */
  create(data) {
    if (!data || !data.name) {
      const err = new Error('name is required');
      err.details = ['name is required'];
      throw err;
    }

    const validation = validateSelectedItems(data.items ?? []);
    if (!validation.valid) {
      const err = new Error('Invalid items format');
      err.details = validation.errors;
      throw err;
    }

    let id = Date.now().toString();
    if (this.getById(id)) {
      id = crypto.randomUUID();
    }

    const now = new Date().toISOString();
    const preset = {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category || 'General',
      prompt: data.prompt || '',
      items: Array.isArray(data.items) ? data.items : [],
      createdAt: now,
      updatedAt: now
    };

    this.presets.push(preset);
    this.save();
    return preset;
  }

  /**
   * Patch a preset by id. Returns the updated preset, or null if not found.
   */
  update(id, patch) {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index === -1) {
      return null;
    }

    const current = this.presets[index];

    if (Object.prototype.hasOwnProperty.call(patch, 'items')) {
      const validation = validateSelectedItems(patch.items ?? []);
      if (!validation.valid) {
        const err = new Error('Invalid items format');
        err.details = validation.errors;
        throw err;
      }
    }

    this.presets[index] = {
      ...current,
      ...patch,
      id: current.id,
      // Ensure items keep the expected type
      items: Object.prototype.hasOwnProperty.call(patch, 'items')
        ? (Array.isArray(patch.items) ? patch.items : [])
        : (Array.isArray(current.items) ? current.items : []),
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.save();
    return this.presets[index];
  }

  remove(id) {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index === -1) {
      return false;
    }

    this.presets.splice(index, 1);
    this.save();
    return true;
  }

  search(query) {
    const lowercaseQuery = String(query || '').toLowerCase();
    return this.presets.filter(preset =>
      (preset.name || '').toLowerCase().includes(lowercaseQuery) ||
      (preset.description || '').toLowerCase().includes(lowercaseQuery) ||
      (preset.category || '').toLowerCase().includes(lowercaseQuery)
    );
  }

  count() {
    return this.presets.length;
  }
}
