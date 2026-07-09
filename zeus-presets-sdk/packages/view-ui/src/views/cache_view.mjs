/**
 * Cache explorer main page — double viewer shell.
 */

import {
  div, h2, p, span, section, select, option, button, label, a
} from 'hyperaxe';
import { template, pageContainer } from './main_views.mjs';
import { getConfig } from '../config.mjs';

/**
 * @param {object} [viewData]
 * @param {string} [viewData.defaultLinea]
 * @param {string[]} [viewData.themes]
 * @param {string} [viewData.currentTheme]
 */
export function cacheView(viewData = {}) {
  const config = getConfig();
  const { defaultLinea = config.defaultLinea || 'espana', currentTheme = config.theme?.current } = viewData;

  return template(
    'Cache Explorer',
    pageContainer(
      div({ class: 'cache-page' },
        section({ class: 'cache-header' },
          div({ class: 'cache-header-row action-row' },
            div({ class: 'cache-header-titles' },
              h2({ class: 'cache-title' }, 'Cache Explorer'),
              p({ class: 'cache-tag' }, 'Navegador de líneas · solo lectura')
            ),
            div({ class: 'cache-header-controls action-row' },
              label({ class: 'cache-linea-label' },
                'Línea',
                select({ class: 'cache-linea-select', id: 'cache-linea-select', 'data-cache-linea': '' },
                  option({ value: defaultLinea, selected: 'selected' }, defaultLinea)
                )
              ),
              span({
                class: 'state-badge',
                id: 'cache-coverage-badge',
                'data-state': 'neutral',
                title: 'Cobertura cache'
              }, 'cobertura —')
            )
          ),
          div({ class: 'cache-breadcrumb-row' },
            span({ class: 'cache-breadcrumb', id: 'cache-breadcrumb' }, '/'),
            span({ class: 'cache-viewer-label', id: 'cache-viewer-label' }, '')
          )
        ),
        div({ class: 'cache-dual-viewer' },
          section({ class: 'cache-tree-panel' },
            div({ class: 'cache-tree-toolbar action-row' },
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'cache-tree-refresh' }, 'Actualizar'),
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'cache-tree-root' }, 'Raíz')
            ),
            div({ id: 'cache-tree-host', class: 'cache-tree-host', role: 'tree' })
          ),
          section({ class: 'cache-viewer-panel' },
            div({ class: 'cache-viewer-toolbar action-row' },
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'cache-copy-path' }, 'Copiar path'),
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'cache-download' }, 'Descargar'),
              a({
                class: 'btn btn-outline btn-sm',
                id: 'cache-open-player',
                href: '#',
                target: '_blank',
                rel: 'noopener'
              }, 'Tablero')
            ),
            div({ id: 'cache-viewer-host', class: 'cache-viewer-host' },
              p({ class: 'cache-viewer-placeholder' }, 'Selecciona un archivo en el árbol.')
            ),
            div({ id: 'cache-viewer-meta', class: 'cache-viewer-meta', hidden: 'hidden' })
          )
        )
      )
    ),
    {
      currentPage: 'cache',
      theme: currentTheme,
      themes: viewData.themes || [],
      styles: [
        '/assets/styles/object-explorer.css',
        '/assets/styles/anchors-explorer.css',
        '/assets/styles/cache-browser.css'
      ],
      scripts: [
        '/assets/js/object-explorer.js',
        '/assets/js/anchors-explorer.js',
        '/assets/js/markdown-preview.js',
        '/assets/js/text-viewer.js',
        '/assets/js/cache-browser.js'
      ]
    }
  );
}
