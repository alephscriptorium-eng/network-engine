/**
 * Editor-ui wrapper around @zeus/ui-kit layout components.
 * Injects editor config, brand, and nav (including Player cross-link).
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

function playerUrl(config) {
  const host = config.player?.host || 'localhost';
  const port = config.player?.port || 3013;
  return `http://${host}:${port}`;
}

function buildNavEntries(config) {
  return [
    { href: '/', emoji: '🏠', text: 'Home', pageKey: 'home' },
    { href: '/presets', emoji: '📚', text: 'Preset Library', pageKey: 'presets' },
    { href: '/editor', emoji: '🔧', text: 'MCP Editor', pageKey: 'mcp' },
    { href: '/settings', emoji: '⚙️', text: 'Settings', pageKey: 'settings' },
    { href: playerUrl(config), emoji: '🎛️', text: 'Player', external: true }
  ];
}

export const template = (pageTitle, content, options = {}) => {
  const config = getConfig();
  return uiTemplate(pageTitle, content, {
    ...options,
    theme: config.theme?.current || 'Black-White-MCP',
    brand: {
      title: 'Zeus Presets Editor',
      footer: '© 2025 Zeus Team - Zeus Presets Editor'
    },
    navEntries: buildNavEntries(config),
    currentPage: options.currentPage || ''
  });
};

export const navigation = (currentPage = '') => {
  const config = getConfig();
  return uiNavigation(currentPage, buildNavEntries(config));
};
