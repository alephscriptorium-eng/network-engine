/**
 * firehose-view-ui wrapper around @zeus/ui-kit shell.
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

export { navLink, pageContainer, contentSection };

function shellOptions(options = {}) {
  const config = getConfig();
  const branding = config.branding || {};
  const dataDir = resolveDataDir(config);
  const mesh = resolveUiMesh({ dataDir, localConfig: config, selfUiId: 'firehose' });
  return {
    uiId: 'firehose',
    meshEntries: mesh.entries,
    localNavEntries: [],
    theme: options.theme || config.theme?.current || 'Black-White-MCP',
    themes: options.themes || [],
    showThemeSelector: true,
    brand: {
      title: branding.title || 'Firehose Explorer',
      tag: 'Zeus Firehose',
      footer: branding.tag || 'Scriptorium · ONFALO'
    },
    currentPage: options.currentPage || 'firehose'
  };
}

export const template = (pageTitle, content, options = {}) => {
  return uiTemplate(pageTitle, content, {
    ...shellOptions(options),
    ...options
  });
};

export const navigation = (currentPage = 'firehose') => {
  const config = getConfig();
  const dataDir = resolveDataDir(config);
  const mesh = resolveUiMesh({ dataDir, localConfig: config, selfUiId: 'firehose' });
  return uiNavigation(currentPage, mesh.entries);
};
