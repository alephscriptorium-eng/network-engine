import path from 'node:path';
import { ThemeHandler as BaseThemeHandler, assetsDir } from '@zeus/ui-kit';
import { getConfig, setTheme } from './config.mjs';

export class ThemeHandler extends BaseThemeHandler {
  constructor() {
    super({
      themesPath: path.join(assetsDir, 'themes'),
      getCurrentTheme: () => getConfig().theme?.current || 'Black-White-MCP',
      setCurrentTheme: setTheme
    });
  }
}
