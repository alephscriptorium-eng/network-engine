/**
 * API routes for the editor UI.
 * Ported from zeus/server/api_routes.js + zeus/backend/backend.js (the
 * presets, mcp and config/theme/settings blocks only). All /ai/conversations
 * routes, the /config/engines route and the stats endpoints were dropped,
 * along with the syncPresetToSlmo42 dual-write - the PresetStore is the
 * single source of truth. Handlers consume @zeus/presets-sdk in-process
 * through the injected store and catalog service.
 */

import express from 'express';
import { exportPresetBundle } from '@zeus/presets-sdk';
import { getConfig, updateConfig, getSectionDefaults } from './config.mjs';

const CATEGORIES = ['General', 'Development', 'Analysis', 'Creative'];

/**
 * Resolve the item type ('tool'|'resource'|'prompt') for a bare item name by
 * looking it up in a {tools, resources, prompts} content object.
 */
function resolveItemType(name, content) {
  if (!content) return null;
  const has = arr => Array.isArray(arr) && arr.some(x => x && (x.name === name || x.id === name));
  if (has(content.tools)) return 'tool';
  if (has(content.resources)) return 'resource';
  if (has(content.resourceTemplates)) return 'resourceTemplate';
  if (has(content.prompts)) return 'prompt';
  return null;
}

/**
 * Normalize items sent by the browser into the rich SDK shape
 * [{serverName, type, name}]. The editor UI sends a flat array of item names
 * plus serverId + serverContent; already-structured items pass through.
 */
function normalizeItems(items, { serverId = null, serverContent = null, catalogEntry = null } = {}) {
  if (!Array.isArray(items)) return [];

  const normalized = [];
  for (const item of items) {
    if (item && typeof item === 'object' && item.name && item.type && item.serverName) {
      normalized.push({ serverName: item.serverName, type: item.type, name: item.name });
      continue;
    }

    const name = typeof item === 'string' ? item : (item?.name || item?.id);
    if (!name) continue;

    const type =
      (typeof item === 'object' && ['tool', 'resource', 'resourceTemplate', 'prompt'].includes(item?.type) && item.type) ||
      resolveItemType(name, serverContent) ||
      resolveItemType(name, catalogEntry) ||
      'tool';

    const serverName =
      (typeof item === 'object' && item?.serverName) ||
      serverId ||
      catalogEntry?.serverName ||
      'unknown';

    normalized.push({ serverName, type, name });
  }
  return normalized;
}

/** Primary server id for a preset: first item's serverName. */
function primaryServerId(preset) {
  const fromItems = Array.isArray(preset.items)
    ? preset.items.find(item => item && item.serverName)?.serverName
    : null;
  return fromItems || preset.serverId || null;
}

/**
 * Enrich a preset with server information the preset cards expect
 * (serverName/serverStatus/counts), derived from the mapped catalog.
 */
function enrichPreset(preset, servers) {
  const enriched = { ...preset };
  const serverId = primaryServerId(preset);
  const selectedToolsCount = Array.isArray(preset.items)
    ? preset.items.filter(item => item?.type === 'tool').length
    : 0;

  if (serverId) {
    const server = servers.find(s => s.id === serverId);
    if (server) {
      enriched.serverId = server.id;
      enriched.serverName = server.name;
      enriched.serverStatus = server.status;
      enriched.serverType = server.type;
      enriched.toolsCount = server.toolsCount;
      enriched.resourcesCount = server.resourcesCount;
      enriched.resourceTemplatesCount = server.resourceTemplatesCount;
      enriched.promptsCount = server.promptsCount;
      enriched.selectedToolsCount = selectedToolsCount;
      return enriched;
    }
    enriched.serverId = serverId;
    enriched.serverName = `Server ${serverId} (Not Found)`;
    enriched.serverStatus = 'disconnected';
    enriched.serverType = 'unknown';
    enriched.toolsCount = 0;
    enriched.resourcesCount = 0;
    enriched.resourceTemplatesCount = 0;
    enriched.promptsCount = 0;
    enriched.selectedToolsCount = selectedToolsCount;
    return enriched;
  }

  enriched.serverName = 'No Server';
  enriched.serverStatus = 'none';
  enriched.serverType = 'none';
  enriched.toolsCount = 0;
  enriched.resourcesCount = 0;
  enriched.resourceTemplatesCount = 0;
  enriched.promptsCount = 0;
  enriched.selectedToolsCount = 0;
  return enriched;
}

export { enrichPreset, normalizeItems, primaryServerId, CATEGORIES };

/**
 * Build the /api router.
 * @param {object} deps
 * @param {import('@zeus/presets-sdk').PresetStore} deps.store
 * @param {ReturnType<import('./catalog.mjs').createCatalogService>} deps.catalog
 * @param {import('./theme-handler.mjs').ThemeHandler} deps.themeHandler
 * @param {() => Promise<object>} [deps.refreshDiscovery]
 */
export function createApiRoutes({ store, catalog, themeHandler, refreshDiscovery }) {
  const router = express.Router();

  // ===========================================
  // HEALTH / CONFIG
  // ===========================================

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'editor-ui-backend',
      timestamp: new Date().toISOString()
    });
  });

  router.get('/config', (req, res) => {
    try {
      const config = getConfig();
      // Don't expose sensitive config data
      const publicConfig = {
        features: config.features,
        theme: config.theme,
        ui: config.ui
      };
      res.json(publicConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load configuration' });
    }
  });

  // ===========================================
  // THEME ENDPOINTS
  // ===========================================

  router.get('/themes', (req, res) => {
    try {
      const themes = themeHandler.getAvailableThemes();
      const current = themeHandler.getCurrentTheme();
      res.json({ themes, current });
    } catch (error) {
      console.error('Error listing themes:', error);
      res.status(500).json({ error: 'Failed to list themes' });
    }
  });

  router.get('/theme', (req, res) => {
    try {
      const current = themeHandler.getCurrentTheme();
      res.json({ current });
    } catch (error) {
      console.error('Error getting current theme:', error);
      res.status(500).json({ error: 'Failed to get current theme' });
    }
  });

  router.post('/theme/switch', (req, res) => {
    try {
      const { theme } = req.body || {};
      if (!theme) {
        return res.status(400).json({ error: "Missing 'theme' in request body" });
      }
      if (!themeHandler.validateTheme(theme)) {
        return res.status(400).json({ error: `Theme '${theme}' not available` });
      }
      const result = themeHandler.switchTheme(theme);
      res.json(result);
    } catch (error) {
      console.error('Error switching theme:', error);
      res.status(500).json({ error: 'Failed to switch theme' });
    }
  });

  // ===========================================
  // SETTINGS ENDPOINTS
  // ===========================================

  router.get('/settings', (req, res) => {
    try {
      const config = getConfig();
      const settings = {
        theme: config.theme,
        ui: config.ui,
        features: config.features,
        discovery: config.discovery,
        presets: config.presets,
        server: {
          port: config.server?.port,
          host: config.server?.host
        }
      };
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  router.put('/settings/:section', async (req, res) => {
    try {
      const { section } = req.params;
      const updates = req.body;

      const validSections = ['theme', 'ui', 'features', 'presets', 'server', 'discovery'];
      if (!validSections.includes(section)) {
        return res.status(400).json({
          error: `Invalid section: ${section}. Valid sections: ${validSections.join(', ')}`
        });
      }

      const config = getConfig();

      // Section-specific validation
      if (section === 'theme' && updates.current) {
        if (!themeHandler.validateTheme(updates.current)) {
          return res.status(400).json({ error: `Invalid theme: ${updates.current}` });
        }
      }

      if (section === 'ui' && updates.language) {
        const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
        if (!validLanguages.includes(updates.language)) {
          return res.status(400).json({
            error: `Invalid language: ${updates.language}. Valid languages: ${validLanguages.join(', ')}`
          });
        }
      }

      const updatedSection = { ...config[section], ...updates };
      const savedConfig = updateConfig({ ...config, [section]: updatedSection });

      if (section === 'discovery' && refreshDiscovery) {
        await refreshDiscovery();
      }

      res.json({
        success: true,
        section,
        updated: updates,
        current: savedConfig[section],
        message: `${section} settings updated successfully`
      });
    } catch (error) {
      console.error(`Error updating ${req.params.section}:`, error);
      res.status(500).json({ error: `Failed to update ${req.params.section} settings` });
    }
  });

  // ===========================================
  // PRESET LIBRARY APIs
  // ===========================================

  /**
   * GET /api/presets - List presets with search/filter, enriched with
   * server status derived from the live catalog.
   */
  router.get('/presets', async (req, res) => {
    try {
      const { search = '', category = '', page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

      const servers = await catalog.getAllServers();
      let presets = store.getAll().map(preset => enrichPreset(preset, servers));

      // Apply search filter
      if (search) {
        const needle = String(search).toLowerCase();
        presets = presets.filter(preset =>
          (preset.name && String(preset.name).toLowerCase().includes(needle)) ||
          (preset.description && String(preset.description).toLowerCase().includes(needle)) ||
          (preset.serverName && String(preset.serverName).toLowerCase().includes(needle)) ||
          (Array.isArray(preset.tags) && preset.tags.some(tag => String(tag).toLowerCase().includes(needle)))
        );
      }

      // Apply category filter
      if (category) {
        presets = presets.filter(preset =>
          preset.category && preset.category.toLowerCase() === String(category).toLowerCase()
        );
      }

      // Apply sorting
      presets.sort((a, b) => {
        const aValue = String(a[sortBy] ?? '');
        const bValue = String(b[sortBy] ?? '');
        return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      });

      // Apply pagination
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedPresets = presets.slice(startIndex, startIndex + limitNum);

      res.json({
        success: true,
        presets: paginatedPresets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: presets.length,
          totalPages: Math.ceil(presets.length / limitNum)
        },
        categories: CATEGORIES
      });
    } catch (error) {
      console.error('Error fetching presets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch presets',
        message: error.message
      });
    }
  });

  /**
   * POST /api/presets - Create new preset.
   * Unlike zeus, `prompt` is optional (catalog-only tool presets have none).
   */
  router.post('/presets', async (req, res) => {
    try {
      const presetData = req.body || {};

      if (!presetData.name || presetData.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Preset name is required'
        });
      }

      const catalogEntry = presetData.serverId
        ? await catalog.getServerEntry(presetData.serverId)
        : null;
      const items = normalizeItems(presetData.items, {
        serverId: presetData.serverId,
        serverContent: presetData.serverContent,
        catalogEntry
      });

      const preset = store.create({
        name: presetData.name.trim(),
        description: presetData.description || '',
        category: presetData.category || 'General',
        prompt: presetData.prompt || '',
        items
      });

      res.status(201).json({
        success: true,
        preset,
        message: 'Preset created successfully'
      });
    } catch (error) {
      console.error('Error creating preset:', error);
      const status = error.details ? 400 : 500;
      res.status(status).json({
        success: false,
        error: 'Failed to create preset',
        message: error.message,
        details: error.details
      });
    }
  });

  /**
   * GET /api/presets/:id/download - Download preset as a ZIP bundle
   */
  router.get('/presets/:id/download', (req, res) => {
    try {
      const { id } = req.params;
      const preset = store.getById(id);

      if (!preset) {
        return res.status(404).json({
          success: false,
          error: 'Preset not found'
        });
      }

      const { filename, stream } = exportPresetBundle(preset);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (error) {
      console.error('Error downloading preset bundle:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to download preset',
          message: error.message
        });
      }
    }
  });

  /**
   * GET /api/presets/:id - Get preset details.
   * The response includes serverName (the catalog server id derived from the
   * preset items) so the editor can auto-select the server in edit mode.
   */
  router.get('/presets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const preset = store.getById(id);

      if (!preset) {
        return res.status(404).json({
          success: false,
          error: 'Preset not found'
        });
      }

      res.json({
        success: true,
        preset: {
          ...preset,
          serverName: primaryServerId(preset)
        }
      });
    } catch (error) {
      console.error('Error fetching preset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch preset',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/presets/:id - Update preset
   */
  router.put('/presets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};

      // Guard against a broken client wiping the preset name
      if (Object.prototype.hasOwnProperty.call(updateData, 'name') &&
          (!updateData.name || String(updateData.name).trim().length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'Preset name cannot be empty'
        });
      }

      const patch = {};
      for (const field of ['name', 'description', 'category', 'prompt', 'tags']) {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
          patch[field] = updateData[field];
        }
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'items')) {
        const catalogEntry = updateData.serverId
          ? await catalog.getServerEntry(updateData.serverId)
          : null;
        patch.items = normalizeItems(updateData.items, {
          serverId: updateData.serverId,
          serverContent: updateData.serverContent,
          catalogEntry
        });
      }

      const updatedPreset = store.update(id, patch);

      if (updatedPreset) {
        res.json({
          success: true,
          preset: updatedPreset,
          message: 'Preset updated successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Preset not found or update failed'
        });
      }
    } catch (error) {
      console.error('Error updating preset:', error);
      const status = error.details ? 400 : 500;
      res.status(status).json({
        success: false,
        error: 'Failed to update preset',
        message: error.message,
        details: error.details
      });
    }
  });

  /**
   * DELETE /api/presets/:id - Delete preset
   */
  router.delete('/presets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = store.remove(id);

      if (success) {
        res.json({
          success: true,
          message: 'Preset deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Preset not found'
        });
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete preset',
        message: error.message
      });
    }
  });

  // ===========================================
  // MCP EDITOR APIs
  // ===========================================

  /**
   * POST /api/mcp/refresh - Re-probe MCP servers and refresh catalog
   */
  router.post('/mcp/refresh', async (req, res) => {
    try {
      if (!refreshDiscovery) {
        return res.status(503).json({
          success: false,
          error: 'Discovery refresh not available'
        });
      }
      const result = await refreshDiscovery();
      res.json({
        success: true,
        found: result.found.length,
        registered: result.registered.length,
        pruned: result.pruned.length,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error refreshing MCP discovery:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh MCP discovery',
        message: error.message
      });
    }
  });

  /**
   * GET /api/mcp/servers - List MCP servers from the live catalog
   */
  router.get('/mcp/servers', async (req, res) => {
    try {
      const servers = await catalog.getAllServers();

      res.json({
        success: true,
        servers,
        totalCount: servers.length
      });
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch MCP servers',
        message: error.message
      });
    }
  });

  /**
   * GET /api/mcp/servers/:id/content - Aggregated tools/resources/prompts
   */
  router.get('/mcp/servers/:id/content', async (req, res) => {
    try {
      const { id } = req.params;
      const [tools, resources, resourceTemplates, prompts] = await Promise.all([
        catalog.getServerTools(id),
        catalog.getServerResources(id),
        catalog.getServerResourceTemplates(id),
        catalog.getServerPrompts(id)
      ]);

      if (!tools && !resources && !resourceTemplates && !prompts) {
        return res.status(404).json({
          success: false,
          error: 'Server not found or no content available'
        });
      }

      res.json({
        success: true,
        server: { id },
        content: {
          tools: tools || [],
          resources: resources || [],
          resourceTemplates: resourceTemplates || [],
          prompts: prompts || []
        }
      });
    } catch (error) {
      console.error('Error fetching MCP server content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch MCP server content',
        message: error.message
      });
    }
  });

  /**
   * GET /api/mcp/servers/:id/tools - List server tools
   */
  router.get('/mcp/servers/:id/tools', async (req, res) => {
    try {
      const { id } = req.params;
      const { search = '', category = '' } = req.query;

      const tools = await catalog.getServerTools(id);

      if (!tools) {
        return res.status(404).json({
          success: false,
          error: 'Server not found or no tools available'
        });
      }

      let filteredTools = tools;
      if (search) {
        const needle = String(search).toLowerCase();
        filteredTools = filteredTools.filter(tool =>
          tool.name.toLowerCase().includes(needle) ||
          (tool.description && tool.description.toLowerCase().includes(needle))
        );
      }

      if (category) {
        filteredTools = filteredTools.filter(tool =>
          tool.category && tool.category.toLowerCase() === String(category).toLowerCase()
        );
      }

      res.json({
        success: true,
        serverId: id,
        tools: filteredTools,
        totalCount: filteredTools.length
      });
    } catch (error) {
      console.error('Error fetching server tools:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch server tools',
        message: error.message
      });
    }
  });

  /**
   * GET /api/mcp/servers/:id/resources - List server resources
   */
  router.get('/mcp/servers/:id/resources', async (req, res) => {
    try {
      const { id } = req.params;
      const { search = '', type = '' } = req.query;

      const resources = await catalog.getServerResources(id);

      if (!resources) {
        return res.status(404).json({
          success: false,
          error: 'Server not found or no resources available'
        });
      }

      let filteredResources = resources;
      if (search) {
        const needle = String(search).toLowerCase();
        filteredResources = filteredResources.filter(resource =>
          resource.name.toLowerCase().includes(needle) ||
          (resource.description && resource.description.toLowerCase().includes(needle))
        );
      }

      if (type) {
        filteredResources = filteredResources.filter(resource => resource.type === type);
      }

      res.json({
        success: true,
        serverId: id,
        resources: filteredResources,
        totalCount: filteredResources.length
      });
    } catch (error) {
      console.error('Error fetching server resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch server resources',
        message: error.message
      });
    }
  });

  /**
   * GET /api/mcp/servers/:id/prompts - List server prompts
   */
  router.get('/mcp/servers/:id/prompts', async (req, res) => {
    try {
      const { id } = req.params;
      const { search = '', category = '' } = req.query;

      const prompts = await catalog.getServerPrompts(id);

      if (!prompts) {
        return res.status(404).json({
          success: false,
          error: 'Server not found or no prompts available'
        });
      }

      let filteredPrompts = prompts;
      if (search) {
        const needle = String(search).toLowerCase();
        filteredPrompts = filteredPrompts.filter(prompt =>
          prompt.name.toLowerCase().includes(needle) ||
          (prompt.description && prompt.description.toLowerCase().includes(needle))
        );
      }

      if (category) {
        filteredPrompts = filteredPrompts.filter(prompt =>
          prompt.category && prompt.category.toLowerCase() === String(category).toLowerCase()
        );
      }

      res.json({
        success: true,
        serverId: id,
        prompts: filteredPrompts,
        totalCount: filteredPrompts.length
      });
    } catch (error) {
      console.error('Error fetching server prompts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch server prompts',
        message: error.message
      });
    }
  });

  /**
   * GET /api/mcp/servers/:id/resource-templates - List server resource templates
   */
  router.get('/mcp/servers/:id/resource-templates', async (req, res) => {
    try {
      const { id } = req.params;
      const { search = '' } = req.query;

      const resourceTemplates = await catalog.getServerResourceTemplates(id);

      if (!resourceTemplates) {
        return res.status(404).json({
          success: false,
          error: 'Server not found or no resource templates available'
        });
      }

      let filtered = resourceTemplates;
      if (search) {
        const needle = String(search).toLowerCase();
        filtered = filtered.filter(template =>
          template.name.toLowerCase().includes(needle) ||
          (template.description && template.description.toLowerCase().includes(needle)) ||
          (template.uriTemplate && template.uriTemplate.toLowerCase().includes(needle))
        );
      }

      res.json({
        success: true,
        serverId: id,
        resourceTemplates: filtered,
        totalCount: filtered.length
      });
    } catch (error) {
      console.error('Error fetching server resource templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch server resource templates',
        message: error.message
      });
    }
  });

  return router;
}
