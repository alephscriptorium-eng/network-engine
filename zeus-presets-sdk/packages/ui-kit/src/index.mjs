import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to shared static assets (themes, base.css, base.js). */
export const assetsDir = path.resolve(__dirname, '..', 'assets');

export {
  template,
  navigation,
  navLink,
  pageContainer,
  contentSection
} from './main-views.mjs';

export { ThemeHandler } from './theme-handler.mjs';
