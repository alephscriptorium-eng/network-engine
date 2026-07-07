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

export { navLink, pageContainer, contentSection };

function editorUrl(config) {
  const host = config.editor?.host || 'localhost';
  const port = config.editor?.port || 3012;
  return `http://${host}:${port}`;
}

function buildNavEntries(config) {
  return [
    { href: '/', emoji: '🎛️', text: 'Deck', pageKey: 'deck' },
    { href: editorUrl(config), emoji: '🔧', text: 'Editor', external: true }
  ];
}

export const template = (pageTitle, content, options = {}) => {
  const config = getConfig();
  return uiTemplate(pageTitle, content, {
    ...options,
    theme: config.theme?.current || 'Black-White-MCP',
    brand: {
      title: 'Zeus Player',
      footer: '© 2025 Zeus Team - Zeus DJ Deck'
    },
    navEntries: buildNavEntries(config),
    currentPage: options.currentPage || 'deck'
  });
};

export const navigation = (currentPage = 'deck') => {
  const config = getConfig();
  return uiNavigation(currentPage, buildNavEntries(config));
};
