/**
 * Zeus shell — shared header, footer, global/local navigation.
 */

import { header, footer, div, nav, ul, li, a, span, select, option, label } from 'hyperaxe';
import { ZEUS_PRODUCT, formatShellFooter, defaultShellBrand } from './brand.mjs';

const nbsp = '\u00A0';

function shellNavLink({ href, emoji, text, current, external = false, className = '' }) {
  return li({ class: 'nav-item' },
    a(
      {
        href,
        class: [className, current ? 'current' : ''].filter(Boolean).join(' ') || undefined,
        ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})
      },
      span({ class: 'emoji' }, emoji),
      nbsp,
      text
    )
  );
}

const THEME_LABELS = {
  'Black-White-MCP': 'Black & White MCP',
  'Clear-MCP': 'Clear MCP',
  'Dark-MCP': 'Dark MCP',
  'Matrix-MCP': 'Matrix MCP',
  'Purple-MCP': 'Purple MCP',
  'Orange-Dark-MCP': 'Orange Dark MCP',
  'Scriptorium-Skins': 'Scriptorium Skins'
};

/**
 * @param {string} uiId
 * @param {string} currentPage
 * @param {object[]} meshEntries
 */
export function buildGlobalNav(uiId, currentPage, meshEntries = []) {
  return meshEntries.map((entry) => {
    const isActive =
      (entry.id === uiId && currentPage !== 'session') ||
      (entry.id === 'session' && currentPage === 'session');
    return shellNavLink({
      href: entry.href,
      emoji: entry.emoji,
      text: entry.label,
      current: isActive,
      external: entry.external,
      className: 'zeus-global-nav-link'
    });
  });
}

/**
 * @param {string} currentPage
 * @param {object[]} localNavEntries
 */
export function buildLocalNav(currentPage = '', localNavEntries = []) {
  if (!localNavEntries.length) return null;
  return nav({ class: 'zeus-shell-subnav' },
    ul({ class: 'zeus-subnav-list' },
      localNavEntries.map((entry) =>
        shellNavLink({
          href: entry.href,
          emoji: entry.emoji,
          text: entry.text,
          current: entry.pageKey === currentPage,
          external: entry.external,
          className: 'zeus-local-nav-link'
        })
      )
    )
  );
}

/**
 * @param {object} options
 */
export function shellHeader(options = {}) {
  const {
    brand = defaultShellBrand(),
    uiId = '',
    currentPage = '',
    meshEntries = [],
    themes = [],
    currentTheme = 'Black-White-MCP',
    showThemeSelector = true
  } = options;

  const themeOptions = themes.length
    ? themes.map((t) =>
        option({ value: t, ...(t === currentTheme ? { selected: 'selected' } : {}) },
          THEME_LABELS[t] || t)
      )
    : [option({ value: currentTheme, selected: 'selected' }, THEME_LABELS[currentTheme] || currentTheme)];

  return header({ class: 'zeus-shell-header' },
    div({ class: 'zeus-shell-header-inner' },
      div({ class: 'zeus-shell-brand' },
        span({ class: 'zeus-shell-brand-title' }, brand.title || ZEUS_PRODUCT),
        brand.tag ? span({ class: 'zeus-shell-brand-tag' }, brand.tag) : null
      ),
      nav({ class: 'zeus-shell-global-nav' },
        ul({ class: 'zeus-global-nav-list' },
          buildGlobalNav(uiId, currentPage, meshEntries)
        )
      ),
      showThemeSelector
        ? label({ class: 'zeus-shell-theme-label', for: 'zeus-theme-select' },
            span({ class: 'zeus-shell-theme-label-text' }, 'Tema'),
            select({
              id: 'zeus-theme-select',
              class: 'zeus-shell-theme-select',
              name: 'theme',
              'aria-label': 'Seleccionar tema'
            }, ...themeOptions)
          )
        : null
    )
  );
}

/**
 * @param {object} options
 */
export function shellFooter(options = {}) {
  const {
    brand = defaultShellBrand(),
    meshEntries = []
  } = options;

  const meshLinks = meshEntries
    .filter((e) => ['editor', 'player', 'view'].includes(e.id))
    .map((entry, idx) => [
      idx > 0 ? span({ class: 'zeus-footer-sep' }, ' · ') : null,
      a({
        href: entry.href,
        class: 'zeus-footer-mesh-link',
        ...(entry.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})
      }, entry.label)
    ])
    .flat()
    .filter(Boolean);

  return footer({ class: 'zeus-shell-footer' },
    div({ class: 'zeus-shell-footer-inner' },
      div({ class: 'zeus-footer-mesh' }, ...meshLinks),
      div({ class: 'zeus-footer-legal' }, brand.footer || formatShellFooter())
    )
  );
}
