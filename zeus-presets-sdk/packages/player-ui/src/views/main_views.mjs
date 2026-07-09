/**
 * Player-ui wrapper around @zeus/ui-kit shell.
 */

import {
  template as uiTemplate,
  navigation as uiNavigation,
  navLink,
  pageContainer,
  contentSection
} from '@zeus/ui-kit';
import { resolveUiMesh } from '@zeus/presets-sdk';
import { getConfig, resolveDataDir } from '../config.mjs';
import { getAlephConfig } from '../aleph-bridge.mjs';

export { navLink, pageContainer, contentSection };

function shellOptions(options = {}) {
  const config = getConfig();
  const aleph = getAlephConfig(config);
  const dataDir = resolveDataDir(config);
  const mesh = resolveUiMesh({ dataDir, localConfig: config, selfUiId: 'player' });
  return {
    uiId: 'player',
    meshEntries: mesh.entries,
    localNavEntries: [],
    theme: options.theme || config.theme?.current || aleph.theme || 'Scriptorium-Skins',
    themes: options.themes || [],
    showThemeSelector: true,
    brand: {
      title: aleph.branding?.title || 'Tablero ALEPH',
      tag: 'Zeus Player',
      footer: `${aleph.branding?.tag || 'Scriptorium Skins'} · GPL-3.0`
    },
    currentPage: options.currentPage || 'deck'
  };
}

export const template = (pageTitle, content, options = {}) => {
  return uiTemplate(pageTitle, content, {
    ...shellOptions(options),
    ...options
  });
};

export const navigation = (currentPage = 'deck') => {
  const config = getConfig();
  const dataDir = resolveDataDir(config);
  const mesh = resolveUiMesh({ dataDir, localConfig: config, selfUiId: 'player' });
  return uiNavigation(currentPage, mesh.entries);
};
