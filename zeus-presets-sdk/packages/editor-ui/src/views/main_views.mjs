/**
 * Main template wrapper and navigation.
 * Ported from zeus/views/main_views.js (CJS -> ESM). AI chat and stats
 * navigation entries removed (no inference in this build).
 *
 * hyperaxe 3 note: `nbsp` is no longer exported (v3 only exports real HTML
 * tags), so we define the non-breaking-space character locally.
 */

import {
  div, html, head, body, title, meta, link, script,
  nav, ul, li, a, span, main, footer, section, h1, h2, h3
} from 'hyperaxe';
import { getConfig } from '../config.mjs';

const nbsp = '\u00A0';

/**
 * Base HTML structure for all views.
 */
export const template = (pageTitle, content, options = {}) => {
  const config = getConfig();
  const currentTheme = config.theme?.current || 'Black-White-MCP';

  return html({ lang: 'en' },
    head(
      meta({ charset: 'utf-8' }),
      meta({ name: 'viewport', content: 'width=device-width, initial-scale=1' }),
      title(`${pageTitle} - Zeus Presets Editor`),

      // Theme CSS loading
      link({
        rel: 'stylesheet',
        href: `/assets/themes/${currentTheme}.css`
      }),

      // Base styles
      link({
        rel: 'stylesheet',
        href: '/assets/styles/base.css'
      }),

      // Page-specific CSS
      ...(options.styles ? options.styles.map(href => link({ rel: 'stylesheet', href })) : [])
    ),

    body({ class: `theme-${currentTheme} ${options.currentPage ? options.currentPage + '-page' : ''}` },
      navigation(options.currentPage),

      main({ class: 'main-content' },
        content
      ),

      footer({ class: 'main-footer' },
        div({ class: 'footer-content' },
          '© 2025 Zeus Team - Zeus Presets Editor'
        )
      ),

      // Base JavaScript
      script({ src: '/assets/js/base.js' }),

      // Page-specific JavaScript
      ...(options.scripts ? options.scripts.map(src => script({ src })) : [])
    )
  );
};

/**
 * Navigation component (AI chat and stats entries removed).
 */
export const navigation = (currentPage = '') => {
  return nav({ class: 'main-navigation' },
    ul({ class: 'nav-list' },
      navLink({ href: '/', emoji: '🏠', text: 'Home', current: currentPage === 'home' }),
      navLink({ href: '/presets', emoji: '📚', text: 'Preset Library', current: currentPage === 'presets' }),
      navLink({ href: '/editor', emoji: '🔧', text: 'MCP Editor', current: currentPage === 'mcp' }),
      navLink({ href: '/settings', emoji: '⚙️', text: 'Settings', current: currentPage === 'settings' })
    )
  );
};

/**
 * Navigation link component.
 */
export const navLink = ({ href, emoji, text, current }) =>
  li(
    a(
      { href, class: current ? 'current' : '' },
      span({ class: 'emoji' }, emoji),
      nbsp,
      text
    )
  );

/**
 * Page container for consistent layout.
 */
export const pageContainer = (content, options = {}) => {
  return section({
    class: `page-container ${options.class || ''}`
  },
    content
  );
};

/**
 * Content section wrapper.
 */
export const contentSection = (title, content, options = {}) => {
  const HeaderTag = options.level === 2 ? h2 : options.level === 3 ? h3 : h1;

  return section({ class: `content-section ${options.class || ''}` },
    title && HeaderTag({ class: 'section-title' }, title),
    div({ class: 'section-content' },
      content
    )
  );
};
