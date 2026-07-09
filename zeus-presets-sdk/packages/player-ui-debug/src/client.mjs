/**
 * Socket.io client for player-ui /session namespace.
 * State mutations notify subscribers; typed events go to state-store via pushEvent.
 */

import { io } from 'socket.io-client';

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;

function emptyState() {
  return {
    connected: false,
    session: null,
    catalog: null,
    debugStats: null,
    lastResolveTiming: {},
    startedAt: Date.now(),
    reconnectAttempt: 0
  };
}

/**
 * @param {string} sessionUrl
 * @param {{ pushEvent?: (type: string, payload?: Record<string, unknown>, detail?: string) => void }} [opts]
 */
export function createSessionClient(sessionUrl, opts = {}) {
  const { pushEvent } = opts;
  const state = emptyState();
  let socket = null;
  let reconnectTimer = null;
  let listeners = new Set();

  function notify() {
    for (const fn of listeners) fn(state);
  }

  function emitEvent(type, payload = {}, detail) {
    pushEvent?.(type, payload, detail);
    notify();
  }

  function attachHandlers(sock) {
    sock.on('connect', () => {
      state.connected = true;
      state.reconnectAttempt = 0;
      emitEvent('connect', { socketId: sock.id });
    });

    sock.on('disconnect', (reason) => {
      state.connected = false;
      emitEvent('disconnect', { reason });
      scheduleReconnect();
    });

    sock.on('connect_error', (err) => {
      state.connected = false;
      emitEvent('connect_error', { message: err.message });
      scheduleReconnect();
    });

    sock.on('session:state', (payload) => {
      state.session = payload;
      emitEvent('session:state', {
        phase: payload?.phase,
        year: payload?.playhead?.year,
        activeCaso: payload?.activeCaso
      });
    });

    sock.on('deck:resolved', (payload) => {
      const nodoId = payload?.nodo?.nodo?.id || payload?.nodo?.id || '—';
      emitEvent('deck:resolved', {
        deckId: payload.deckId,
        year: payload.year,
        nodoId
      });
    });

    sock.on('catalog:servers', (servers) => {
      state.catalog = servers;
      const up = Array.isArray(servers) ? servers.filter(s => s.isConnected !== false).length : 0;
      emitEvent('catalog:servers', {
        up,
        total: servers?.length ?? 0
      });
    });

    sock.on('wikitext:cache-result', (payload) => {
      emitEvent('wikitext:cache-result', {
        ok: payload.ok === true,
        oldid: payload.oldid,
        error: payload.error
      });
    });

    sock.on('wikitext:poll-result', (payload) => {
      emitEvent('wikitext:poll-result', {
        cached: payload.cached,
        oldid: payload.oldid,
        error: payload.error
      });
    });

    sock.on('debug:stats', (payload) => {
      state.debugStats = payload;
      notify();
    });

    sock.on('debug:resolve-timing', (payload) => {
      state.lastResolveTiming[payload.deckId] = payload;
      emitEvent('debug:resolve-timing', {
        deckId: payload.deckId,
        ms: payload.ms?.toFixed?.(1) ?? payload.ms
      });
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    state.reconnectAttempt += 1;
    const delay = Math.min(RECONNECT_BASE_MS * state.reconnectAttempt, RECONNECT_MAX_MS);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (socket && !socket.connected) {
        socket.connect();
      }
    }, delay);
  }

  function connect() {
    if (socket?.connected) return;
    if (socket) {
      socket.connect();
      emitEvent('reconnect', { mode: 'manual' });
      return;
    }
    socket = io(sessionUrl, {
      transports: ['websocket', 'polling'],
      reconnection: false
    });
    attachHandlers(socket);
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    state.connected = false;
  }

  function emit(event, payload) {
    if (!socket?.connected) {
      emitEvent('emit:blocked', { event });
      return false;
    }
    socket.emit(event, payload);
    emitEvent(`emit:${event}`, {
      raw: payload ? JSON.stringify(payload) : ''
    });
    return true;
  }

  return {
    getState: () => state,
    onUpdate: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      connect();
    },
    emit,
    setPlayhead: (year) => emit('playhead:set', { year }),
    pauseTransport: () => emit('transport:pause'),
    playTransport: () => emit('transport:play'),
    toggleSync: () => emit('sync:toggle'),
    deckLoad: (payload) => emit('deck:load', payload),
    registroSelect: (payload) => emit('registro:select', payload),
    wikitextCache: (payload) => emit('wikitext:cache', payload),
    wikitextPoll: (payload) => emit('wikitext:poll', payload),
    setCaso: (casoId) => emit('caso:set', { casoId })
  };
}
