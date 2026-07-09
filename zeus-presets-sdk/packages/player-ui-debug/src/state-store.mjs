/**
 * Central state store for TUI + MCP (player://snapshot).
 * Subscribes to socket client and REST poller; owns the typed event ring buffer.
 */

/** @typedef {'1.0'} PlayerSnapshotSchemaVersion */

/**
 * @typedef {object} PlayerEvent
 * @property {string} ts - ISO-8601 timestamp
 * @property {string} type - socket / emit / rest event name
 * @property {string} [detail] - human-readable summary for TUI
 * @property {Record<string, unknown>} [payload] - structured data for agents
 */

/**
 * Stable agent-facing snapshot (player://snapshot).
 *
 * @typedef {object} PlayerSnapshot
 * @property {PlayerSnapshotSchemaVersion} schemaVersion
 * @property {number} updatedAt - epoch ms
 * @property {object} monitor
 * @property {number} monitor.uptimeMs
 * @property {string} monitor.startedAt - ISO-8601
 * @property {object} monitor.playerUi
 * @property {string} monitor.playerUi.baseUrl
 * @property {string} monitor.playerUi.sessionUrl
 * @property {string} monitor.playerUi.host
 * @property {number} monitor.playerUi.port
 * @property {object} monitor.debugMcp
 * @property {string} monitor.debugMcp.host
 * @property {number} monitor.debugMcp.port
 * @property {boolean} monitor.debugServer
 * @property {object} monitor.pollIntervals
 * @property {number} monitor.pollIntervals.restMs
 * @property {number} monitor.pollIntervals.refreshHz
 * @property {object} health
 * @property {object} health.socket
 * @property {boolean} health.socket.connected
 * @property {number} health.socket.reconnectAttempt
 * @property {object} health.rest
 * @property {string|null} health.rest.status - 'ok' | 'error' | null
 * @property {number|null} health.rest.lastFetchAt
 * @property {string|null} health.rest.lastError
 * @property {boolean} health.rest.fetching
 * @property {object|null} session - full session:state payload
 * @property {object} decks - { A, B } deck entries from session
 * @property {unknown[]|null} catalog - socket catalog:servers
 * @property {object} infrastructure
 * @property {unknown[]|null} infrastructure.servers - REST /api/servers
 * @property {unknown|null} infrastructure.anchors - REST /api/aleph/anchors
 * @property {unknown|null} infrastructure.medicion - REST medicion for defaultCaso
 * @property {unknown|null} infrastructure.alephConfig - REST /api/aleph/config
 * @property {unknown|null} infrastructure.alephTopology - REST /api/aleph/topology
 * @property {unknown[]|null} infrastructure.presets - REST /api/presets
 * @property {object} debug
 * @property {unknown|null} debug.stats - socket debug:stats
 * @property {Record<string, unknown>} debug.resolveTiming - per-deck timing
 * @property {PlayerEvent[]} events - recent typed events (newest first)
 */

const SCHEMA_VERSION = '1.0';

/**
 * @param {string} type
 * @param {Record<string, unknown>} payload
 * @returns {string}
 */
function defaultDetail(type, payload) {
  switch (type) {
    case 'connect':
      return String(payload.socketId ?? '');
    case 'disconnect':
      return String(payload.reason ?? '');
    case 'connect_error':
      return String(payload.message ?? '');
    case 'session:state':
      return `phase=${payload.phase} year=${payload.year}${payload.activeCaso ? ` caso=${payload.activeCaso}` : ''}`;
    case 'deck:resolved':
      return `${payload.deckId} y=${payload.year} nodo=${payload.nodoId}`;
    case 'catalog:servers':
      return `${payload.up}/${payload.total} up`;
    case 'wikitext:cache-result':
      return payload.ok ? `ok oldid=${payload.oldid}` : String(payload.error ?? '');
    case 'wikitext:poll-result':
      return payload.cached ? `cached oldid=${payload.oldid}` : String(payload.error ?? 'pending');
    case 'debug:resolve-timing':
      return `${payload.deckId} ${payload.ms}ms`;
    case 'reconnect':
      return String(payload.mode ?? '');
    case 'emit:blocked':
      return `${payload.event} (offline)`;
    default:
      if (type.startsWith('emit:')) {
        return payload.raw != null ? String(payload.raw) : '';
      }
      return '';
  }
}

/**
 * @param {{ config: ReturnType<import('./config.mjs').getDebugConfig>, client: ReturnType<import('./client.mjs').createSessionClient>, poller: ReturnType<import('./rest-poller.mjs').createRestPoller> }} opts
 */
export function createStateStore({ config, client, poller }) {
  const startedAt = Date.now();
  const maxEvents = config.maxEvents ?? 32;
  /** @type {PlayerEvent[]} */
  const events = [];
  const updateListeners = new Set();

  let clientState = client.getState();
  let restState = poller.getState();

  function notify() {
    for (const fn of updateListeners) fn();
  }

  /**
   * Record a typed event into the ring buffer (called by client.mjs).
   * @param {string} type
   * @param {Record<string, unknown>} [payload]
   * @param {string} [detail]
   */
  function recordEvent(type, payload = {}, detail) {
    const entry = {
      ts: new Date().toISOString(),
      type,
      payload,
      detail: detail ?? defaultDetail(type, payload)
    };
    events.unshift(entry);
    if (events.length > maxEvents) events.length = maxEvents;
    notify();
  }

  client.onUpdate((s) => {
    clientState = s;
    notify();
  });

  poller.onUpdate((s) => {
    restState = s;
    notify();
  });

  function getMonitorUptime() {
    return Date.now() - startedAt;
  }

  /**
   * @returns {PlayerSnapshot}
   */
  function getSnapshot() {
    const restHealth = restState.health;
    const restStatus = restHealth?.status === 'ok'
      ? 'ok'
      : (restHealth?.error || restState.lastError ? 'error' : null);

    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: Date.now(),
      monitor: {
        uptimeMs: getMonitorUptime(),
        startedAt: new Date(startedAt).toISOString(),
        playerUi: {
          baseUrl: config.baseUrl,
          sessionUrl: config.sessionUrl,
          host: config.host,
          port: config.port
        },
        debugMcp: {
          host: config.mcpHost,
          port: config.mcpPort
        },
        debugServer: config.debugServer === true,
        pollIntervals: {
          restMs: config.restPollMs,
          refreshHz: config.refreshHz
        }
      },
      health: {
        socket: {
          connected: clientState.connected,
          reconnectAttempt: clientState.reconnectAttempt
        },
        rest: {
          status: restStatus,
          lastFetchAt: restState.lastFetchAt,
          lastError: restState.lastError,
          fetching: restState.fetching
        }
      },
      session: clientState.session,
      decks: clientState.session?.decks ?? { A: null, B: null },
      catalog: clientState.catalog,
      infrastructure: {
        servers: restState.servers,
        anchors: restState.anchors,
        medicion: restState.medicion,
        alephConfig: restState.alephConfig,
        alephTopology: restState.alephTopology,
        presets: restState.presets
      },
      debug: {
        stats: clientState.debugStats,
        resolveTiming: clientState.lastResolveTiming ?? {}
      },
      events: getEvents(maxEvents)
    };
  }

  function getSession() {
    return clientState.session;
  }

  function getDeck(deckId) {
    return clientState.session?.decks?.[deckId] ?? null;
  }

  /**
   * @param {number} [limit]
   * @returns {PlayerEvent[]}
   */
  function getEvents(limit = maxEvents) {
    return events.slice(0, limit);
  }

  /** TUI-compatible view (events injected into clientState shape). */
  function getTuiContext() {
    return {
      clientState: {
        ...clientState,
        events: getEvents(config.tuiMaxEvents ?? 8)
      },
      restState
    };
  }

  /** @returns {ReturnType<typeof getSnapshot>['health']} */
  function getHealth() {
    const snap = getSnapshot();
    return snap.health;
  }

  function mergeServers(socketCatalog, restServers) {
    const byKey = new Map();
    if (Array.isArray(restServers)) {
      for (const s of restServers) {
        const key = s.name || s.id || String(byKey.size);
        byKey.set(key, { ...s, sources: ['rest'] });
      }
    }
    if (Array.isArray(socketCatalog)) {
      for (const s of socketCatalog) {
        const key = s.name || s.id || String(byKey.size);
        const existing = byKey.get(key);
        if (existing) {
          byKey.set(key, { ...existing, ...s, sources: [...new Set([...(existing.sources || []), 'socket'])] });
        } else {
          byKey.set(key, { ...s, sources: ['socket'] });
        }
      }
    }
    return {
      socket: socketCatalog,
      rest: restServers,
      merged: [...byKey.values()]
    };
  }

  function getServers() {
    return mergeServers(clientState.catalog, restState.servers);
  }

  function getAnchors() {
    return restState.anchors;
  }

  function getMedicion(casoId) {
    const id = casoId || config.defaultCaso;
    if (id === config.defaultCaso) return restState.medicion;
    return restState.medicionByCaso?.[id] ?? restState.medicion;
  }

  function getClientState() {
    return getTuiContext().clientState;
  }

  function getRestState() {
    return restState;
  }

  // Hooks for Agent B (MCP server) and Agent E (startAll) — wired in later waves.
  function getClient() {
    return client;
  }

  function getPoller() {
    return poller;
  }

  function getConfig() {
    return config;
  }

  return {
    recordEvent,
    getSnapshot,
    getSession,
    getDeck,
    getEvents,
    getHealth,
    getServers,
    getAnchors,
    getMedicion,
    getTuiContext,
    getClientState,
    getRestState,
    getMonitorUptime,
    getClient,
    getPoller,
    getConfig,
    onUpdate: (fn) => {
      updateListeners.add(fn);
      return () => updateListeners.delete(fn);
    }
  };
}
