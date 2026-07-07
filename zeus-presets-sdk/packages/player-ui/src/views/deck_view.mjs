/**
 * DJ deck view — two platters, playhead transport, sync toggle.
 * DOM contract consumed by assets/js/deck.js:
 *   #playhead-slider, #playhead-value, #sync-toggle, #transport-play,
 *   #transport-pause, #session-phase, #session-dump, .cue-mark[data-year],
 *   .deck-server[data-deck], .deck-preset[data-deck], .deck-load[data-deck],
 *   .deck-state[data-deck], .deck-resolved[data-deck]
 */

import { div, h3, p, label, select, option, input, button, span, section, pre } from 'hyperaxe';
import { template, pageContainer, contentSection } from './main_views.mjs';
import { getConfig } from '../config.mjs';

/**
 * @param {object} viewData
 * @param {Array} viewData.servers
 * @param {Array} viewData.presets
 */
export function deckView(viewData = {}) {
  const config = getConfig();
  const { servers = [], presets = [] } = viewData;
  const range = config.deck?.troncoRange || { min: 450, max: 2026 };
  const cues = config.deck?.parteCues || [];
  const defaultYear = config.deck?.defaultYear ?? 2010;

  return template(
    'Deck',
    pageContainer(
      contentSection(
        'Mesa de DJ',
        div({ class: 'deck-container' },
          p({ class: 'deck-intro' },
            'Dos platos sincronizados sobre servidores MCP linea-poder. Los presets Zeus actúan como filtros de capacidades.'
          ),
          div({ class: 'transport-bar' },
            div({ class: 'transport-controls' },
              button({ id: 'transport-play', type: 'button', class: 'btn' }, '► Play'),
              button({ id: 'transport-pause', type: 'button', class: 'btn' }, '❚❚ Pause'),
              button({ id: 'sync-toggle', type: 'button', class: 'btn' }, '🔗 Sync: ON')
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
          div({ class: 'decks-grid' },
            deckPanel('A', servers, presets),
            deckPanel('B', servers, presets)
          ),
          section({ class: 'session-log' },
            h3({}, 'Sesión: ', span({ id: 'session-phase' }, 'idle')),
            pre({ id: 'session-dump', class: 'session-dump' }, '{}')
          )
        )
      )
    ),
    {
      currentPage: 'deck',
      styles: ['/assets/styles/deck.css'],
      scripts: ['/socket.io/socket.io.js', '/assets/js/deck.js']
    }
  );
}

function deckPanel(deckId, servers, presets) {
  const defaultServer = deckId === 'A' ? 'linea-espana' : 'linea-wp-historia';
  const serverOptions = [
    option({ value: '' }, '(elegir servidor)'),
    ...servers.map(s =>
      option({ value: s.id, ...(s.id === defaultServer ? { selected: 'selected' } : {}) }, s.name)
    )
  ];
  const presetOptions = [
    option({ value: '' }, '(sin preset)'),
    ...presets.map(pr => option({ value: pr.id }, pr.name))
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
    div({ class: 'deck-resolved', 'data-deck': deckId }, '—')
  );
}
