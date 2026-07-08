/**
 * Theme handler for @zeus/player-ui — config injected via ui-kit ThemeHandler.
 */

import path from 'node:path';
import { ThemeHandler as BaseThemeHandler, assetsDir } from '@zeus/ui-kit';
import { getConfig, setTheme } from './config.mjs';

export class ThemeHandler extends BaseThemeHandler {
  constructor() {
    super({
      themesPath: path.join(assetsDir, 'themes'),
      getCurrentTheme: () => getConfig().theme?.current || 'Scriptorium-Skins',
      setCurrentTheme: setTheme
    });
  }
}
