import { createShellViews } from '@zeus/app-shell';
import { defaultShellBrand } from '@zeus/ui-kit';
import { getAppConfig, resolveDataDir } from '../config.mjs';

function buildLocalNavEntries() {
  return [
    { href: '/', emoji: '🏠', text: 'Home', pageKey: 'home' },
    { href: '/presets', emoji: '📚', text: 'Preset Library', pageKey: 'presets' },
    { href: '/editor', emoji: '🔧', text: 'MCP Editor', pageKey: 'mcp' },
    { href: '/settings', emoji: '⚙️', text: 'Settings', pageKey: 'settings' }
  ];
}

export const { template, navLink, pageContainer, contentSection } = createShellViews({
  uiId: 'editor',
  getAppConfig,
  resolveDataDir,
  buildLocalNavEntries,
  defaultTheme: 'Black-White-MCP',
  getBrand: () => defaultShellBrand('Zeus Presets Editor')
});
