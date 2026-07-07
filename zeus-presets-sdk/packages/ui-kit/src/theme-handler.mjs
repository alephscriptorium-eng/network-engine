/**
 * Parameterized theme handler shared by editor-ui and player-ui.
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_THEMES = [
  'Black-White-MCP',
  'Clear-MCP',
  'Dark-MCP',
  'Matrix-MCP',
  'Purple-MCP',
  'Orange-Dark-MCP',
  'Scriptorium-Skins'
];

export class ThemeHandler {
  /**
   * @param {object} options
   * @param {string} options.themesPath - directory containing {ThemeName}.css files
   * @param {string[]} [options.availableThemes]
   * @param {() => string} options.getCurrentTheme
   * @param {(themeName: string) => object} options.setCurrentTheme - persists and returns config
   */
  constructor({ themesPath, availableThemes = DEFAULT_THEMES, getCurrentTheme, setCurrentTheme }) {
    if (!themesPath) throw new Error('ThemeHandler requires themesPath');
    if (typeof getCurrentTheme !== 'function') throw new Error('ThemeHandler requires getCurrentTheme');
    if (typeof setCurrentTheme !== 'function') throw new Error('ThemeHandler requires setCurrentTheme');

    this.themesPath = themesPath;
    this.availableThemes = availableThemes;
    this._getCurrentTheme = getCurrentTheme;
    this._setCurrentTheme = setCurrentTheme;
  }

  getAvailableThemes() {
    return this.availableThemes;
  }

  getCurrentTheme() {
    return this._getCurrentTheme() || 'Black-White-MCP';
  }

  switchTheme(themeName) {
    if (!this.availableThemes.includes(themeName)) {
      throw new Error(`Theme '${themeName}' not available`);
    }

    const config = this._setCurrentTheme(themeName);
    const currentTheme = config?.theme?.current ?? themeName;

    return {
      success: true,
      currentTheme,
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
