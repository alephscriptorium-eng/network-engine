/**
 * Player-ui wrapper around @zeus/ui-kit layout components.
 */

import {
  template as uiTemplate,
  navigation as uiNavigation,
  navLink,
  pageContainer,
  contentSection
} from '@zeus/ui-kit';
import { getConfig } from '../config.mjs';
import { getAlephConfig } from '../aleph-bridge.mjs';

export { navLink, pageContainer, contentSection };

function editorUrl(config) {
  const host = config.editor?.host || 'localhost';
  const port = config.editor?.port || 3012;
  return `http://${host}:${port}`;
}

function buildNavEntries(config) {
  return [
    { href: '/', emoji: '🎛️', text: 'Tablero', pageKey: 'deck' },
    { href: '/session', emoji: '🔍', text: 'Sesión', pageKey: 'session' },
    { href: editorUrl(config), emoji: '🔧', text: 'Editor', external: true }
  ];
}

export const template = (pageTitle, content, options = {}) => {
  const config = getConfig();
  const aleph = getAlephConfig(config);
  const theme = options.theme || config.theme?.current || aleph.theme || 'Scriptorium-Skins';
  return uiTemplate(pageTitle, content, {
    ...options,
    theme,
    brand: {
      title: `${aleph.branding?.title || 'Tablero ALEPH'} · Zeus Player`,
      footer: `${aleph.branding?.tag || 'Scriptorium Skins'} · GPL-3.0`
    },
    navEntries: buildNavEntries(config),
    currentPage: options.currentPage || 'deck'
  });
};

export const navigation = (currentPage = 'deck') => {
  const config = getConfig();
  return uiNavigation(currentPage, buildNavEntries(config));
};
