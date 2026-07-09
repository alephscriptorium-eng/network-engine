/**
 * Theme routes — re-export from @zeus/ui-kit with player config injection.
 */

import { createThemeRoutes as createUiKitThemeRoutes } from '@zeus/ui-kit';
import { getConfig } from './config.mjs';

/**
 * @param {import('./theme-handler.mjs').ThemeHandler} themeHandler
 */
export function createThemeRoutes(themeHandler) {
  return createUiKitThemeRoutes(themeHandler, getConfig);
}
