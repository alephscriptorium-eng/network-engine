/**
 * Session debug page — focus-based object explorer.
 */

import { div, h2, h3, p, span, section, a, button } from 'hyperaxe';
import { template, pageContainer, contentSection } from './main_views.mjs';
import { getConfig } from '../config.mjs';
import { getAlephConfig } from '../aleph-bridge.mjs';

/**
 * @param {object} [viewData]
 * @param {string[]} [viewData.themes]
 * @param {string} [viewData.currentTheme]
 * @param {boolean} [viewData.debugEnabled]
 */
export function sessionView(viewData = {}) {
  const config = getConfig();
  const aleph = getAlephConfig(config);
  const {
    themes = [],
    currentTheme = config.theme?.current,
    debugEnabled = config.debug === true
  } = viewData;

  return template(
    'Sesión debug',
    pageContainer(
      div({ class: 'session-page' },
        section({ class: 'session-header' },
          div({ class: 'session-header-row action-row' },
            div({ class: 'session-header-titles' },
              h2({ class: 'session-title' }, 'Sesión debug'),
              p({ class: 'session-tag' }, 'Explorador en vivo · socket /session')
            ),
            a({ href: '/', class: 'btn btn-outline' }, 'Volver al Tablero')
          ),
          div({ class: 'session-status-bar action-row' },
            span({ class: 'state-badge', id: 'session-phase-badge', 'data-state': 'idle' }, 'idle'),
            span({ class: 'session-meta', id: 'session-playhead-meta' }, 'año —'),
            span({ class: 'session-meta', id: 'session-sync-meta' }, 'sync —'),
            span({
              class: 'state-badge',
              id: 'session-debug-mode-badge',
              'data-state': debugEnabled ? 'playing' : 'loading',
              hidden: debugEnabled ? undefined : 'hidden'
            }, debugEnabled ? 'debug on' : '')
          )
        ),
        contentSection(null,
          div({ id: 'session-explorer', class: 'session-explorer-host' })
        ),
        section({ class: 'mcp-monitor-section' },
          div({ id: 'mcp-monitor-host' })
        )
      )
    ),
    {
      currentPage: 'session',
      theme: currentTheme || aleph.theme || 'Scriptorium-Skins',
      themes,
      styles: [
        '/assets/styles/object-explorer.css',
        '/assets/styles/mcp-monitor.css',
        '/assets/styles/session.css'
      ],
      scripts: [
        '/assets/js/object-explorer.js',
        '/assets/js/mcp-monitor.js',
        '/socket.io/socket.io.js',
        '/assets/js/session.js'
      ]
    }
  );
}
