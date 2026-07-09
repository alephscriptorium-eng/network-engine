/**
 * Parameterized HTML shell shared by all Zeus UIs.
 */

import {
  div, html, head, body, title, meta, link, script, main,
  footer, nav, ul, li, a, span, section, h1, h2, h3
} from 'hyperaxe';
import { shellHeader, shellFooter, buildLocalNav } from './shell.mjs';

const nbsp = '\u00A0';

/**
 * @typedef {object} NavEntry
 * @property {string} href
 * @property {string} emoji
 * @property {string} text
 * @property {string} [pageKey]
 * @property {boolean} [external]
 */

/**
 * @typedef {object} BrandConfig
 * @property {string} title
 * @property {string} [tag]
 * @property {string} footer
 */

/**
 * Base HTML structure for all Zeus UIs.
 * @param {string} pageTitle
 * @param {import('hyperaxe').VNode} content
 * @param {object} [options]
 */
export const template = (pageTitle, content, options = {}) => {
  const {
    theme = 'Black-White-MCP',
    brand = { title: 'Zeus', footer: '© 2025 Zeus Team' },
    navEntries = [],
    meshEntries = navEntries,
    localNavEntries = [],
    uiId = '',
    currentPage = '',
    themes = [],
    showThemeSelector = true,
    styles = [],
    scripts = []
  } = options;

  const useShell = Boolean(uiId || meshEntries.length || localNavEntries.length);

  return html({ lang: 'en' },
    head(
      meta({ charset: 'utf-8' }),
      meta({ name: 'viewport', content: 'width=device-width, initial-scale=1' }),
      title(`${pageTitle} - ${brand.title}`),
      link({ rel: 'stylesheet', href: `/assets/themes/${theme}.css` }),
      link({ rel: 'stylesheet', href: '/assets/styles/base.css' }),
      link({ rel: 'stylesheet', href: '/assets/styles/components.css' }),
      link({ rel: 'stylesheet', href: '/assets/styles/shell.css' }),
      link({ rel: 'stylesheet', href: '/assets/styles/viewer-launcher.css' }),
      ...styles.map((href) => link({ rel: 'stylesheet', href }))
    ),
    body({ class: `theme-${theme} ${currentPage ? currentPage + '-page' : ''} ui-${uiId || 'zeus'}` },
      useShell
        ? shellHeader({
            brand,
            uiId,
            currentPage,
            meshEntries,
            themes,
            currentTheme: theme,
            showThemeSelector
          })
        : navigation(currentPage, navEntries),
      useShell ? buildLocalNav(currentPage, localNavEntries) : null,
      main({ class: 'main-content' }, content),
      useShell
        ? shellFooter({ brand, meshEntries })
        : footer({ class: 'main-footer' },
            div({ class: 'footer-content' }, brand.footer)
          ),
      script({ src: '/assets/js/base.js' }),
      useShell ? script({ src: '/assets/js/shell.js' }) : null,
      useShell ? script({ src: '/assets/js/viewer-launcher.js' }) : null,
      ...scripts.map((src) => script({ src }))
    )
  );
};

/**
 * @deprecated Use shell global nav via template({ uiId, meshEntries }).
 */
export const navigation = (currentPage = '', navEntries = []) =>
  nav({ class: 'main-navigation' },
    ul({ class: 'nav-list' },
      navEntries.map((entry) =>
        navLink({
          href: entry.href,
          emoji: entry.emoji,
          text: entry.text,
          current: entry.pageKey === currentPage,
          external: entry.external
        })
      )
    )
  );

export const navLink = ({ href, emoji, text, current, external = false, className = '' }) =>
  li({ class: 'nav-item' },
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

export const pageContainer = (content, options = {}) =>
  section({ class: `page-container ${options.class || ''}` }, content);

export const contentSection = (sectionTitle, content, options = {}) => {
  const HeaderTag = options.level === 2 ? h2 : options.level === 3 ? h3 : h1;
  return section({ class: `content-section ${options.class || ''}` },
    sectionTitle && HeaderTag({ class: 'section-title' }, sectionTitle),
    div({ class: 'section-content' }, content)
  );
};
