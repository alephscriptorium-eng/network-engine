import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to shared static assets (themes, base.css, components.css, object-explorer, mcp-monitor, base.js). */
export const assetsDir = path.resolve(__dirname, '..', 'assets');

export {
  template,
  navigation,
  navLink,
  pageContainer,
  contentSection
} from './main-views.mjs';

export {
  shellHeader,
  shellFooter,
  buildGlobalNav,
  buildLocalNav
} from './shell.mjs';

export { ThemeHandler } from './theme-handler.mjs';
export { createThemeRoutes } from './theme-routes.mjs';

export {
  openViewerLink,
  openViewerButton,
  viewerLauncherMenu,
  viewerLauncherSlot
} from './viewer-launcher.mjs';
