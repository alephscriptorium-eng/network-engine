/**
 * Firehose explorer main page — dual viewer + micropost preview.
 */

import {
  div, h2, p, span, section, button, label, nav, input
} from 'hyperaxe';
import { template, pageContainer } from './main_views.mjs';
import { getConfig } from '../config.mjs';

/**
 * @param {object} [viewData]
 */
export function firehoseView(viewData = {}) {
  const config = getConfig();
  const defaultCorpus = viewData.defaultCorpus || config.defaultCorpus || 'candidate';

  return template(
    'Firehose Explorer',
    pageContainer(
      div({ class: 'firehose-page' },
        section({ class: 'firehose-header' },
          div({ class: 'firehose-header-row action-row' },
            div({ class: 'firehose-header-titles' },
              h2({ class: 'firehose-title' }, 'Firehose Explorer'),
              p({ class: 'firehose-tag' }, 'ONFALO · Jetstream microposts · solo lectura')
            ),
            div({ class: 'firehose-header-controls action-row' },
              span({
                class: 'state-badge',
                id: 'firehose-stats-badge',
                'data-state': 'neutral',
                title: 'Conteo por corpus'
              }, 'stats —')
            )
          ),
          nav({ class: 'firehose-corpus-nav action-row', id: 'firehose-corpus-nav', role: 'tablist' },
            button({
              type: 'button',
              class: 'btn btn-outline btn-sm firehose-corpus-tab',
              'data-corpus': 'candidate',
              role: 'tab',
              'aria-selected': defaultCorpus === 'candidate' ? 'true' : 'false'
            }, 'Candidatos'),
            button({
              type: 'button',
              class: 'btn btn-outline btn-sm firehose-corpus-tab',
              'data-corpus': 'raw',
              role: 'tab',
              'aria-selected': defaultCorpus === 'raw' ? 'true' : 'false'
            }, 'Raw'),
            button({
              type: 'button',
              class: 'btn btn-outline btn-sm firehose-corpus-tab',
              'data-corpus': 'discarded',
              role: 'tab',
              'aria-selected': defaultCorpus === 'discarded' ? 'true' : 'false'
            }, 'Descartados'),
            button({
              type: 'button',
              class: 'btn btn-outline btn-sm firehose-corpus-tab',
              'data-corpus': 'labeled',
              role: 'tab',
              'aria-selected': defaultCorpus === 'labeled' ? 'true' : 'false'
            }, 'Etiquetados')
          ),
          div({ class: 'firehose-toolbar-row action-row' },
            div({ class: 'firehose-breadcrumb-row' },
              span({ class: 'firehose-breadcrumb', id: 'firehose-breadcrumb' }, '/'),
              span({ class: 'firehose-mode-label', id: 'firehose-mode-label' }, '')
            ),
            div({ class: 'firehose-mode-toggle action-row', role: 'group', 'aria-label': 'Modo visor' },
              label({ class: 'firehose-mode-option' },
                input({
                  type: 'radio',
                  name: 'firehose-mode',
                  value: 'raw',
                  id: 'firehose-mode-raw',
                  checked: 'checked'
                }),
                ' Raw'
              ),
              label({ class: 'firehose-mode-option' },
                input({
                  type: 'radio',
                  name: 'firehose-mode',
                  value: 'preview',
                  id: 'firehose-mode-preview'
                }),
                ' Preview'
              )
            )
          )
        ),
        div({ class: 'zeus-dual-viewer firehose-dual-viewer' },
          section({ class: 'zeus-dual-viewer-tree-panel firehose-tree-panel' },
            div({ class: 'firehose-tree-toolbar action-row' },
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'firehose-tree-refresh' }, 'Actualizar'),
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'firehose-tree-root' }, 'Raíz'),
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'firehose-triage-btn' }, 'Triage manifest')
            ),
            div({ id: 'firehose-tree-host', class: 'zeus-dual-viewer-tree-host firehose-tree-host', role: 'tree' })
          ),
          section({ class: 'zeus-dual-viewer-viewer-panel firehose-viewer-panel' },
            div({ class: 'firehose-viewer-toolbar action-row' },
              button({ type: 'button', class: 'btn btn-outline btn-sm', id: 'firehose-copy-path' }, 'Copiar path')
            ),
            div({ id: 'firehose-viewer-host', class: 'zeus-dual-viewer-viewer-host firehose-viewer-host' },
              p({ class: 'zeus-dual-viewer-placeholder' }, 'Selecciona un archivo o activa Preview en un directorio.')
            ),
            div({ id: 'firehose-preview-host', class: 'firehose-preview-host', hidden: 'hidden' },
              div({ id: 'firehose-micropost-list-host', class: 'firehose-micropost-list-host' }),
              div({ id: 'firehose-micropost-card-host', class: 'firehose-micropost-card-host' })
            ),
            div({ id: 'firehose-empty-state', class: 'firehose-empty-state', hidden: 'hidden' },
              p({ class: 'firehose-empty-title' }, 'Sin posts etiquetados'),
              p({ class: 'firehose-empty-desc' }, 'El pipeline CDR aún no ha persistido datos en labeled/. Los etiquetados en vivo dependerán de MCP :3008 en una fase futura.')
            )
          )
        )
      )
    ),
    {
      currentPage: 'firehose',
      theme: viewData.currentTheme || config.theme?.current,
      themes: viewData.themes || [],
      styles: [
        '/assets/styles/dual-viewer.css',
        '/assets/styles/micropost-list.css',
        '/assets/styles/firehose-browser.css'
      ],
      scripts: [
        '/assets/js/object-explorer.js',
        '/assets/js/micropost-list.js',
        '/assets/js/firehose-browser.js'
      ]
    }
  );
}
