/**
 * Tablero ALEPH — DJ deck view with LED strip, crossover, drawer.
 */

import {
  div, h2, h3, h4, p, label, select, option, input, button, span, section, pre, a, ul, li
} from 'hyperaxe';
import { template, pageContainer, contentSection } from './main_views.mjs';
import { getConfig } from '../config.mjs';
import { getAlephConfig } from '../aleph-bridge.mjs';

/**
 * @param {object} viewData
 * @param {Array} viewData.servers
 * @param {Array} viewData.presets
 */
export function deckView(viewData = {}) {
  const config = getConfig();
  const aleph = getAlephConfig(config);
  const { servers = [], presets = [] } = viewData;
  const range = config.deck?.troncoRange || { min: 450, max: 2026 };
  const cues = config.deck?.parteCues || [];
  const defaultYear = config.deck?.defaultYear ?? 2010;

  const presetIdByName = (name) => presets.find(p => p.name === name)?.id || '';

  const defaultPresetA = presetIdByName(aleph.defaultPresets.A);
  const defaultPresetB = presetIdByName(aleph.defaultPresets.B);

  return template(
    'Tablero ALEPH',
    pageContainer(
      div({ class: 'tablero-container' },
        headerAleph(aleph),
        contentSection(null,
          div({ class: 'deck-container' },
            div({ class: 'transport-bar' },
              div({ class: 'transport-controls' },
                button({ id: 'transport-play', type: 'button', class: 'btn' }, 'Play'),
                button({ id: 'transport-pause', type: 'button', class: 'btn' }, 'Pause'),
                button({ id: 'sync-toggle', type: 'button', class: 'btn' }, 'Sync: ON')
              ),
              div({ class: 'playhead-control' },
                label({ for: 'playhead-slider' }, 'Año histórico'),
                div({ class: 'playhead-row' },
                  input({
                    id: 'playhead-slider',
                    type: 'range',
                    min: String(range.min),
                    max: String(range.max),
                    step: '1',
                    value: String(defaultYear)
                  }),
                  span({ id: 'playhead-value', class: 'playhead-value' }, String(defaultYear))
                ),
                div({ class: 'cue-marks' },
                  cues.map(cue =>
                    button({
                      type: 'button',
                      class: 'cue-mark',
                      'data-year': String(cue.year),
                      title: `Ir al año ${cue.year}`
                    }, `Parte ${cue.id} · ${cue.year}`)
                  )
                )
              )
            ),
            section({ class: 'anchor-strip-section' },
              h3({ class: 'subsection-title' }, 'Wave A — anclas P01–P24'),
              div({ id: 'anchor-strip', class: 'anchor-strip' },
                p({ class: 'anchor-loading' }, 'Cargando anclas…')
              ),
              div({ id: 'anchor-summary', class: 'anchor-summary' }, '')
            ),
            div({ class: 'decks-grid' },
              deckPanel('A', servers, presets, 'linea-espana', defaultPresetA),
              deckPanel('B', servers, presets, 'linea-wp-historia', defaultPresetB)
            ),
            section({ class: 'crossover-panel', id: 'crossover' },
              h3({ class: 'subsection-title' }, 'Crossover medidor'),
              div({ class: 'crossover-bands' },
                div({ class: 'band band-graves' },
                  h4({}, 'Graves — blockchain'),
                  p({ id: 'crossover-pregunta', class: 'crossover-text' }, '—')
                ),
                div({ class: 'band band-medios' },
                  h4({}, 'Medios — tronco'),
                  p({ id: 'crossover-tesis', class: 'crossover-text' }, '—')
                ),
                div({ class: 'band band-agudos' },
                  h4({}, 'Agudos — medidor'),
                  label({ class: 'caso-select-label', for: 'caso-select' }, 'Caso'),
                  select({ id: 'caso-select', class: 'caso-select' },
                    aleph.casos.map(c =>
                      option({
                        value: c,
                        ...(c === aleph.defaultCaso ? { selected: 'selected' } : {})
                      }, c)
                    )
                  ),
                  div({ id: 'vu-meters', class: 'vu-meters' }, '—')
                )
              )
            ),
            section({ class: 'drawer-panel' },
              div({ class: 'drawer-tabs', role: 'tablist' },
                button({ type: 'button', class: 'drawer-tab active', 'data-tab': 'viaje', id: 'tab-viaje' }, 'Viaje caché'),
                button({ type: 'button', class: 'drawer-tab', 'data-tab': 'mcp', id: 'tab-mcp' }, 'MCP topology'),
                button({ type: 'button', class: 'drawer-tab', 'data-tab': 'prensa', id: 'tab-prensa' }, 'Prensa')
              ),
              div({ id: 'drawer-viaje', class: 'drawer-content active', 'data-panel': 'viaje' },
                div({ id: 'viaje-stats' }, 'Cargando cobertura…'),
                p({ class: 'viaje-protocol' },
                  'Protocolo 6 pasos: declarar cobertura → proponer viaje → usuario aprueba N → fetch_batch.py → audit → blockchain. MCP READ-ONLY.'
                ),
                p({},
                  a({
                    href: 'https://github.com/escrivivir-co/aleph-scriptorium',
                    target: '_blank',
                    rel: 'noopener'
                  }, 'Ver CACHE_RUNBOOK en repo')
                )
              ),
              div({ id: 'drawer-mcp', class: 'drawer-content', 'data-panel': 'mcp', hidden: 'hidden' },
                div({ id: 'topology-graph', class: 'topology-graph' }, 'Cargando topología…')
              ),
              div({ id: 'drawer-prensa', class: 'drawer-content', 'data-panel': 'prensa', hidden: 'hidden' },
                ul({ class: 'prensa-links', id: 'prensa-links' },
                  (aleph.prensa?.publicaciones || []).map(pub =>
                    li({},
                      a({
                        href: `${aleph.prensa?.baseUrl || ''}/${pub.caso}/publicaciones/${pub.slug}.html`,
                        target: '_blank',
                        rel: 'noopener'
                      }, pub.label)
                    )
                  )
                )
              )
            ),
            section({ class: 'session-log collapsible' },
              button({ type: 'button', class: 'btn session-toggle', id: 'session-toggle' }, 'Sesión debug'),
              div({ class: 'session-log-body', id: 'session-log-body', hidden: 'hidden' },
                h3({}, 'Sesión: ', span({ id: 'session-phase' }, 'idle')),
                pre({ id: 'session-dump', class: 'session-dump' }, '{}')
              )
            )
          )
        )
      )
    ),
    {
      currentPage: 'deck',
      theme: aleph.theme || config.theme?.current,
      styles: ['/assets/styles/deck.css'],
      scripts: ['/socket.io/socket.io.js', '/assets/js/deck.js']
    }
  );
}

function headerAleph(aleph) {
  return section({ class: 'tablero-header' },
    h2({ class: 'tablero-title' }, aleph.branding?.title || 'Tablero ALEPH'),
    p({ class: 'tablero-tag' }, aleph.branding?.tag || 'Scriptorium Skins')
  );
}

function deckPanel(deckId, servers, presets, defaultServer, defaultPresetId) {
  const serverOptions = [
    option({ value: '' }, '(elegir servidor)'),
    ...servers.map(s =>
      option({ value: s.id, ...(s.id === defaultServer ? { selected: 'selected' } : {}) }, s.name)
    )
  ];
  const presetOptions = [
    option({ value: '' }, '(sin preset)'),
    ...presets.map(pr =>
      option({
        value: pr.id,
        ...(pr.id === defaultPresetId ? { selected: 'selected' } : {})
      }, pr.name)
    )
  ];

  return section({ class: 'deck-panel', 'data-deck-id': deckId },
    h3({ class: 'deck-title' }, `Plato ${deckId}`),
    label({ class: 'deck-field' }, 'Servidor',
      select({ class: 'deck-server', 'data-deck': deckId }, serverOptions)
    ),
    label({ class: 'deck-field' }, 'Preset (filtro)',
      select({ class: 'deck-preset', 'data-deck': deckId }, presetOptions)
    ),
    button({ type: 'button', class: 'btn deck-load', 'data-deck': deckId }, 'Cargar plato'),
    div({ class: 'deck-status-row' },
      span({ class: 'deck-state', 'data-deck': deckId, 'data-state': 'empty' }, 'empty')
    ),
    div({ class: 'deck-resolved', 'data-deck': deckId },
      deckId === 'B'
        ? div({ class: 'deck-b-content' },
            div({ class: 'deck-b-summary', 'data-deck': deckId }, '—'),
            div({ class: 'registros-list-wrap' },
              h4({ class: 'registros-title' }, 'Revisiones WP temáticas'),
              div({ class: 'registros-list', 'data-deck': deckId },
                p({ class: 'registros-empty' }, 'Cargar plato para ver registros')
              )
            ),
            div({ class: 'wikitext-preview', 'data-deck': deckId }, '')
          )
        : '—'
    )
  );
}
