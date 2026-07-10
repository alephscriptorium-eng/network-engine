/**
 * Shared theme handler factory for Zeus UI packages.
 */

import path from 'node:path';
import { ThemeHandler as BaseThemeHandler, assetsDir } from '@zeus/ui-kit';

/**
 * @param {object} options
 * @param {() => object} options.getAppConfig
 * @param {(name: string) => object} options.setTheme
 * @param {string} [options.defaultTheme='Black-White-MCP']
 */
export function createThemeHandler({ getAppConfig, setTheme, defaultTheme = 'Black-White-MCP' }) {
  return class AppThemeHandler extends BaseThemeHandler {
    constructor() {
      super({
        themesPath: path.join(assetsDir, 'themes'),
        getCurrentTheme: () => getAppConfig().theme?.current || defaultTheme,
        setCurrentTheme: setTheme
      });
    }
  };
}
