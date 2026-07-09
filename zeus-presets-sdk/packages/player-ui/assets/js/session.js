/**
 * Session debug page — socket live state + MCP monitor via ui-kit components.
 */

(function () {
  const socket = io('/session', { transports: ['websocket', 'polling'] });

  let sessionState = null;
  let explorer = null;
  let monitor = null;

  const phaseBadge = document.getElementById('session-phase-badge');
  const playheadMeta = document.getElementById('session-playhead-meta');
  const syncMeta = document.getElementById('session-sync-meta');
  const explorerHost = document.getElementById('session-explorer');
  const monitorHost = document.getElementById('mcp-monitor-host');

  const ROOT_TABS = [
    { label: 'session', path: 'session' },
    { label: 'decks.A', path: 'decks.A' },
    { label: 'decks.B', path: 'decks.B' },
    { label: 'playhead', path: 'playhead' }
  ];

  function pathFromHash() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return null;
    const m = hash.match(/^path=(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function syncHash(path) {
    const next = '#path=' + encodeURIComponent(path || 'session');
    if (window.location.hash !== next) {
      history.replaceState(null, '', next);
    }
  }

  function eventToPath(event) {
    const type = event.type;
    const p = event.payload || {};
    if (type === 'deck:resolved' && p.deckId) {
      return 'decks.' + p.deckId + '.resolved';
    }
    if (type === 'session:state') return 'session';
    if (type === 'debug:resolve-timing' && p.deckId) {
      return 'decks.' + p.deckId;
    }
    return null;
  }

  function updateHeader(state) {
    if (!state) return;
    const phase = typeof state.phase === 'string' ? state.phase : JSON.stringify(state.phase);
    if (phaseBadge) {
      phaseBadge.textContent = phase;
      phaseBadge.dataset.state = phase;
    }
    if (playheadMeta && state.playhead) {
      const play = state.playhead.playing ? 'PLAY' : 'PAUSE';
      playheadMeta.textContent = 'año ' + state.playhead.year + ' · ' + play;
    }
    if (syncMeta) {
      syncMeta.textContent = state.sync ? 'sync ON' : 'sync OFF';
    }
  }

  async function fetchSnapshot() {
    const res = await fetch('/api/debug/snapshot', { signal: AbortSignal.timeout(1200) });
    return res.json();
  }

  function mountExplorer() {
    if (!explorerHost || !window.ZeusObjectExplorer) return;
    const initialPath = pathFromHash() || 'session';
    explorer = window.ZeusObjectExplorer.mount(explorerHost, {
      getData: function () { return sessionState; },
      path: initialPath,
      rootLabel: 'session',
      rootTabs: ROOT_TABS,
      onPathChange: syncHash
    });
  }

  function mountMonitor() {
    if (!monitorHost || !window.ZeusMcpMonitor) return;
    monitor = window.ZeusMcpMonitor.mount(monitorHost, {
      title: 'Monitor MCP',
      fetchSnapshot: fetchSnapshot,
      pollIntervalMs: 3500,
      onEventClick: function (ev) {
        const jumpPath = eventToPath(ev);
        if (jumpPath && explorer) explorer.setPath(jumpPath);
      }
    });
  }

  function onSessionState(state) {
    sessionState = state;
    updateHeader(state);
    if (explorer) explorer.refresh();
  }

  socket.on('session:state', onSessionState);

  socket.on('debug:stats', function (payload) {
    if (monitor) monitor.setDebugStats(payload);
  });

  socket.on('debug:resolve-timing', function () {
    if (explorer) explorer.refresh();
    if (monitor) monitor.refresh();
  });

  window.addEventListener('hashchange', function () {
    const p = pathFromHash();
    if (p && explorer) explorer.setPath(p);
  });

  mountExplorer();
  mountMonitor();
})();
