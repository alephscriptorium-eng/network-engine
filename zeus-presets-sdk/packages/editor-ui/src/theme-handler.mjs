/**
 * Theme handler for @zeus/editor-ui.
 * Ported from zeus/backend/themeHandler.js (CJS -> ESM); theme CSS files
 * live under assets/themes in this package.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, setTheme } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ThemeHandler {
  constructor() {
    this.themesPath = path.join(__dirname, '..', 'assets', 'themes');
    this.availableThemes = [
      'Black-White-MCP',
      'Clear-MCP',
      'Dark-MCP',
      'Matrix-MCP',
      'Purple-MCP',
      'Orange-Dark-MCP'
    ];
  }

  getAvailableThemes() {
    return this.availableThemes;
  }

  getCurrentTheme() {
    const config = getConfig();
    return config.theme?.current || 'Black-White-MCP';
  }

  switchTheme(themeName) {
    if (!this.availableThemes.includes(themeName)) {
      throw new Error(`Theme '${themeName}' not available`);
    }

    const config = setTheme(themeName);
    return {
      success: true,
      currentTheme: config.theme.current,
      message: `Theme switched to ${themeName}`
    };
  }

  getThemeCSS(themeName) {
    try {
      const themePath = path.join(this.themesPath, `${themeName}.css`);
      if (fs.existsSync(themePath)) {
        return fs.readFileSync(themePath, 'utf8');
      }
      console.warn(`Theme file not found: ${themePath}`);
      const defaultPath = path.join(this.themesPath, 'Black-White-MCP.css');
      return fs.readFileSync(defaultPath, 'utf8');
    } catch (error) {
      console.error('Error loading theme CSS:', error);
      return `:root {
        --primary-color: #2563EB;
        --background-primary: #FFFFFF;
        --text-primary: #0F172A;
        --success-color: #059669;
        --warning-color: #D97706;
        --danger-color: #DC2626;
      }`;
    }
  }

  validateTheme(themeName) {
    return this.availableThemes.includes(themeName);
  }
}
