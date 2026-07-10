import { createThemeHandler } from '@zeus/app-shell';
import { getAppConfig, setTheme } from './config.mjs';

export const ThemeHandler = createThemeHandler({
  getAppConfig,
  setTheme,
  defaultTheme: 'Scriptorium-Skins'
});
