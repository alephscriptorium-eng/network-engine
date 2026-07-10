/**
 * Parameterized HTML shell shared by all Zeus UIs.
 */

import {
  div, html, head, body, title, meta, link, script, main,
  span, section, h1, h2, h3, li, a
} from 'hyperaxe';
import { shellHeader, shellFooter, buildLocalNav } from './shell.mjs';
import { defaultShellBrand } from './brand.mjs';

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
    brand = defaultShellBrand(),
    meshEntries = [],
    localNavEntries = [],
    uiId = 'zeus',
    currentPage = '',
    themes = [],
    showThemeSelector = true,
    styles = [],
    scripts = []
  } = options;

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
    body({ class: `theme-${theme} ${currentPage ? currentPage + '-page' : ''} ui-${uiId}` },
      shellHeader({
        brand,
        uiId,
        currentPage,
        meshEntries,
        themes,
        currentTheme: theme,
        showThemeSelector
      }),
      buildLocalNav(currentPage, localNavEntries),
      main({ class: 'main-content' }, content),
      shellFooter({ brand, meshEntries }),
      script({ src: '/assets/js/base.js' }),
      script({ src: '/assets/js/shell.js' }),
      script({ src: '/assets/js/viewer-launcher.js' }),
      ...scripts.map((src) => script({ src }))
    )
  );
};

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
