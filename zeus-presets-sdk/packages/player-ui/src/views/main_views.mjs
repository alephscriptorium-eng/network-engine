import { createShellViews } from '@zeus/app-shell';
import { defaultShellBrand } from '@zeus/ui-kit';
import { getAppConfig, resolveDataDir } from '../config.mjs';
import { getAlephConfig } from '../aleph-bridge.mjs';

export const { template, navLink, pageContainer, contentSection } = createShellViews({
  uiId: 'player',
  getAppConfig,
  resolveDataDir,
  defaultCurrentPage: 'deck',
  defaultTheme: 'Scriptorium-Skins',
  getBrand: (config) => {
    const aleph = getAlephConfig(config);
    return defaultShellBrand(aleph.branding?.title || 'Tablero ALEPH');
  }
});
