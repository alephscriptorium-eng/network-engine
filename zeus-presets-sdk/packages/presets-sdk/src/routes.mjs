import express from 'express';
import { validateSelectedItems, countPresetItems } from './preset-store.mjs';

/**
 * Normalize a POST /set body to the rich preset schema.
 * Accepts both the legacy shape {presetName, selectedItems} and the
 * rich shape {name, description?, category?, prompt?, items}.
 */
function normalizeSetBody(body = {}) {
  if (body.presetName !== undefined || body.selectedItems !== undefined) {
    return {
      name: body.presetName,
      description: body.description || '',
      category: body.category || 'General',
      prompt: body.prompt || '',
      items: body.selectedItems
    };
  }

  return {
    name: body.name,
    description: body.description || '',
    category: body.category || 'General',
    prompt: body.prompt || '',
    items: body.items
  };
}

/**
 * Express router exposing the MCP catalog and preset CRUD under `prefix`.
 */
export function createPresetRoutes({ registry, store, prefix = '/api/mcp' } = {}) {
  const router = express.Router();

  // GET {prefix}/list - full MCP catalog
  router.get(`${prefix}/list`, async (req, res) => {
    try {
      const catalog = await registry.buildCatalog();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        catalog,
        serversCount: catalog.length,
        totalTools: catalog.reduce((sum, server) => sum + server.tools.length, 0),
        totalResources: catalog.reduce((sum, server) => sum + server.resources.length, 0),
        totalPrompts: catalog.reduce((sum, server) => sum + server.prompts.length, 0)
      });

    } catch (error) {
      console.error('Error retrieving MCP catalog:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error retrieving MCP catalog',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST {prefix}/set - create or update-by-name a preset
  router.post(`${prefix}/set`, (req, res) => {
    try {
      const data = normalizeSetBody(req.body);

      if (!data.name) {
        return res.status(400).json({
          success: false,
          error: 'name (or presetName) is required',
          timestamp: new Date().toISOString()
        });
      }

      const validation = validateSelectedItems(data.items);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid items format',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
      }

      const existing = store.getByName(data.name);
      const preset = existing
        ? store.update(existing.id, data)
        : store.create(data);

      console.log(`Preset '${preset.name}' saved with ${preset.items.length} items`);

      res.json({
        success: true,
        preset: {
          id: preset.id,
          name: preset.name,
          itemsCount: countPresetItems(preset.items),
          createdAt: preset.createdAt
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.details) {
        return res.status(400).json({
          success: false,
          error: error.message,
          details: error.details,
          timestamp: new Date().toISOString()
        });
      }
      console.error('Error setting preset:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error setting MCP preset',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET {prefix}/presets - list preset summaries
  router.get(`${prefix}/presets`, (req, res) => {
    try {
      const presets = store.getAll().map(preset => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        itemsCount: countPresetItems(preset.items),
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt
      }));

      res.json({
        success: true,
        presets,
        totalPresets: presets.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error listing presets:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error listing presets',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET {prefix}/preset/:name - full preset by name
  router.get(`${prefix}/preset/:name`, (req, res) => {
    try {
      const { name } = req.params;
      const preset = store.getByName(name);

      if (!preset) {
        return res.status(404).json({
          success: false,
          error: `Preset '${name}' not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        preset,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting preset:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error getting preset',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // DELETE {prefix}/preset/:id - remove preset by id
  router.delete(`${prefix}/preset/:id`, (req, res) => {
    try {
      const { id } = req.params;
      const removed = store.remove(id);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: `Preset with id '${id}' not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error deleting preset:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error deleting preset',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
