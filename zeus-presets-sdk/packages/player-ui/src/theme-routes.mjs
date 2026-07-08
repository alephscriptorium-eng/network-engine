/**
 * Theme + public config routes for player-ui (shared contract with ui-kit base.js).
 */

import express from 'express';
import { getConfig } from './config.mjs';

/**
 * @param {import('./theme-handler.mjs').ThemeHandler} themeHandler
 */
export function createThemeRoutes(themeHandler) {
  const router = express.Router();

  router.get('/config', (req, res) => {
    try {
      const config = getConfig();
      res.json({ theme: config.theme });
    } catch {
      res.status(500).json({ error: 'Failed to load configuration' });
    }
  });

  router.get('/themes', (req, res) => {
    try {
      res.json({
        themes: themeHandler.getAvailableThemes(),
        current: themeHandler.getCurrentTheme()
      });
    } catch (error) {
      console.error('Error listing themes:', error);
      res.status(500).json({ error: 'Failed to list themes' });
    }
  });

  router.get('/theme', (req, res) => {
    try {
      res.json({ current: themeHandler.getCurrentTheme() });
    } catch (error) {
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

  return router;
}
