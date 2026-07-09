/**
 * Parameterized HTML shell shared by editor-ui and player-ui.
 */

import {
  div, html, head, body, title, meta, link, script,
  nav, ul, li, a, span, main, footer, section, h1, h2, h3
} from 'hyperaxe';

const nbsp = '\u00A0';

/**
 * @typedef {object} NavEntry
 * @property {string} href
 * @property {string} emoji
 * @property {string} text
 * @property {string} [pageKey] - matches options.currentPage when active
 * @property {boolean} [external]
 */

/**
 * @typedef {object} BrandConfig
 * @property {string} title - suffix after page title
 * @property {string} footer
 */

/**
 * Base HTML structure for all Zeus UIs.
 * @param {string} pageTitle
 * @param {import('hyperaxe').VNode} content
 * @param {object} [options]
 * @param {string} [options.theme]
 * @param {BrandConfig} [options.brand]
 * @param {NavEntry[]} [options.navEntries]
 * @param {string} [options.currentPage]
 * @param {string[]} [options.styles]
 * @param {string[]} [options.scripts]
 */
export const template = (pageTitle, content, options = {}) => {
  const {
    theme = 'Black-White-MCP',
    brand = { title: 'Zeus', footer: '© 2025 Zeus Team' },
    navEntries = [],
    currentPage = '',
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
      ...styles.map(href => link({ rel: 'stylesheet', href }))
    ),
    body({ class: `theme-${theme} ${currentPage ? currentPage + '-page' : ''}` },
      navigation(currentPage, navEntries),
      main({ class: 'main-content' }, content),
      footer({ class: 'main-footer' },
        div({ class: 'footer-content' }, brand.footer)
      ),
      script({ src: '/assets/js/base.js' }),
      ...scripts.map(src => script({ src }))
    )
  );
};

/**
 * @param {string} currentPage
 * @param {NavEntry[]} navEntries
 */
export const navigation = (currentPage = '', navEntries = []) =>
  nav({ class: 'main-navigation' },
    ul({ class: 'nav-list' },
      navEntries.map(entry =>
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

export const navLink = ({ href, emoji, text, current, external = false }) =>
  li(
    a(
      {
        href,
        class: current ? 'current' : '',
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
