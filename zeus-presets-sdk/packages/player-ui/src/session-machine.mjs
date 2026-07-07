/**
 * XState 5 session machine for the Zeus DJ deck.
 * Session: idle → preparada → activa → cierre
 * Deck actor phases: empty → loading → cued → playing → degraded
 */

import { setup, assign } from 'xstate';

export const PARTE_CUES = [
  { id: 'I', label: 'I', year: 450 },
  { id: 'II', label: 'II', year: 1350 },
  { id: 'III', label: 'III', year: 1808 },
  { id: 'IV', label: 'IV', year: 1978 }
];

export function emptyDeck() {
  return {
    phase: 'empty',
    serverName: null,
    presetId: null,
    filtered: null,
    resolved: null
  };
}

function hasLoadedDeck(decks) {
  return Object.values(decks).some(d => d.phase !== 'empty' && d.phase !== 'loading');
}

function allCuedOrPlaying(decks) {
  const active = Object.values(decks).filter(d => d.phase !== 'empty');
  return active.length > 0 && active.every(d => ['cued', 'playing', 'degraded'].includes(d.phase));
}

export const sessionMachine = setup({
  types: {
    context: {},
    events: {}
  },
  actions: {
    assignDeckLoading: assign({
      decks: ({ context, event }) => ({
        ...context.decks,
        [event.deckId]: {
          ...emptyDeck(),
          phase: 'loading',
          serverName: event.serverName,
          presetId: event.presetId ?? null
        }
      })
    }),
    assignDeckLoaded: assign({
      decks: ({ context, event }) => ({
        ...context.decks,
        [event.deckId]: {
          ...context.decks[event.deckId],
          phase: event.phase,
          filtered: event.filtered,
          resolved: event.resolved ?? context.decks[event.deckId]?.resolved ?? null
        }
      })
    }),
    assignDeckResolved: assign({
      decks: ({ context, event }) => ({
        ...context.decks,
        [event.deckId]: {
          ...context.decks[event.deckId],
          resolved: event.resolved,
          phase: event.phase ?? context.decks[event.deckId]?.phase
        }
      })
    }),
    assignDeckDegraded: assign({
      decks: ({ context, event }) => ({
        ...context.decks,
        [event.deckId]: {
          ...context.decks[event.deckId],
          phase: 'degraded'
        }
      })
    }),
    assignPlayhead: assign({
      playhead: ({ context, event }) => ({
        ...context.playhead,
        year: event.year
      })
    }),
    setPlaying: assign({
      playhead: ({ context }) => ({ ...context.playhead, playing: true })
    }),
    setPaused: assign({
      playhead: ({ context }) => ({ ...context.playhead, playing: false })
    }),
    toggleSync: assign({
      sync: ({ context }) => !context.sync
    })
  },
  guards: {
    hasLoadedDeck: ({ context }) => hasLoadedDeck(context.decks),
    allCuedOrPlaying: ({ context }) => allCuedOrPlaying(context.decks)
  }
}).createMachine({
  id: 'session',
  initial: 'idle',
  context: {
    playhead: { year: 2010, playing: false },
    sync: true,
    decks: { A: emptyDeck(), B: emptyDeck() }
  },
  states: {
    idle: {
      on: {
        DECK_LOADING: { target: 'preparada', actions: 'assignDeckLoading' }
      }
    },
    preparada: {
      on: {
        DECK_LOADING: { actions: 'assignDeckLoading' },
        DECK_LOADED: [
          { guard: 'allCuedOrPlaying', target: 'activa', actions: 'assignDeckLoaded' },
          { actions: 'assignDeckLoaded' }
        ],
        DECK_RESOLVED: { actions: 'assignDeckResolved' },
        DECK_DEGRADED: { actions: 'assignDeckDegraded' },
        PLAYHEAD_SET: { actions: 'assignPlayhead' },
        SYNC_TOGGLE: { actions: 'toggleSync' },
        TRANSPORT_PLAY: { target: 'activa', actions: 'setPlaying' },
        TRANSPORT_PAUSE: { actions: 'setPaused' },
        SESSION_CLOSE: 'cierre'
      }
    },
    activa: {
      on: {
        DECK_LOADING: { actions: 'assignDeckLoading' },
        DECK_LOADED: { actions: 'assignDeckLoaded' },
        DECK_RESOLVED: { actions: 'assignDeckResolved' },
        DECK_DEGRADED: { actions: 'assignDeckDegraded' },
        PLAYHEAD_SET: { actions: 'assignPlayhead' },
        SYNC_TOGGLE: { actions: 'toggleSync' },
        TRANSPORT_PLAY: { actions: 'setPlaying' },
        TRANSPORT_PAUSE: { target: 'preparada', actions: 'setPaused' },
        SESSION_CLOSE: 'cierre'
      }
    },
    cierre: { type: 'final' }
  }
});

/**
 * Build a serializable snapshot for socket broadcast.
 */
export function snapshotFromActor(actor) {
  const { value, context } = actor.getSnapshot();
  return {
    phase: value,
    playhead: context.playhead,
    sync: context.sync,
    decks: context.decks,
    parteCues: PARTE_CUES
  };
}
