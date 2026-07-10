import { createShellViews } from '@zeus/app-shell';
import { defaultShellBrand } from '@zeus/ui-kit';
import { getAppConfig, resolveDataDir } from '../config.mjs';

export const { template, navLink, pageContainer, contentSection } = createShellViews({
  uiId: 'view',
  getAppConfig,
  resolveDataDir,
  defaultCurrentPage: 'cache',
  defaultTheme: 'Black-White-MCP',
  getBrand: (config) => {
    const branding = config.branding || {};
    return defaultShellBrand(branding.title || 'Cache Explorer');
  }
});
