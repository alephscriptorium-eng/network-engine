/**
 * MCP monitor panel (browser) — health, debug stats, event ring buffer.
 * Reusable across player-ui session page, editor-ui, etc.
 */
(function (global) {
  'use strict';

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTiming(timing, deckId) {
    const t = timing?.[deckId];
    if (t == null) return '—';
    if (typeof t === 'object' && t.ms != null) return t.ms + 'ms';
    return String(t);
  }

  function socketState(connected) {
    return connected
      ? { label: 'connected', state: 'playing' }
      : { label: 'offline', state: 'warning' };
  }

  function restState(status) {
    if (status === 'ok') return { label: 'ok', state: 'playing' };
    if (status === 'error') return { label: 'error', state: 'degraded' };
    return { label: '—', state: 'loading' };
  }

  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {() => Promise<unknown>} options.fetchSnapshot
   * @param {number} [options.pollIntervalMs]
   * @param {string} [options.title]
   * @param {(event: object, index: number) => void} [options.onEventClick]
   * @param {(event: object) => string|null} [options.eventToPath]
   * @param {number} [options.maxEvents]
   */
  function mount(container, options) {
    if (!container || !options || typeof options.fetchSnapshot !== 'function') {
      throw new Error('McpMonitor.mount requires container and fetchSnapshot');
    }

    const title = options.title || 'Monitor MCP';
    const maxEvents = options.maxEvents || 16;
    let pollTimer = null;
    let snapshot = null;
    let available = false;
    let socketDebugStats = null;

    container.innerHTML =
      '<div class="mcp-monitor" data-mcp-monitor>' +
        '<div class="mcp-monitor-header action-row">' +
          '<div class="mcp-monitor-title-row">' +
            '<h3 class="subsection-title mcp-monitor-title">' + escapeHtml(title) + '</h3>' +
            '<span class="state-badge" data-mm-conn-badge data-state="loading">checking</span>' +
          '</div>' +
          '<button type="button" class="btn btn-outline btn-small" data-mm-refresh>Refresh</button>' +
        '</div>' +
        '<p class="mcp-monitor-offline-banner" data-mm-offline hidden>Monitor offline — solo datos en vivo del socket.</p>' +
        '<div class="mcp-monitor-body" data-mm-body>' +
          '<p class="mcp-monitor-section-label">Health</p>' +
          '<div class="status-grid mcp-monitor-health-grid" data-mm-health></div>' +
          '<p class="mcp-monitor-section-label">Debug</p>' +
          '<div class="status-grid mcp-monitor-debug-grid" data-mm-debug></div>' +
          '<p class="mcp-monitor-section-label">Eventos recientes</p>' +
          '<div class="mcp-monitor-events-wrap">' +
            '<div class="list-panel mcp-monitor-events" data-mm-events></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const connBadge = container.querySelector('[data-mm-conn-badge]');
    const offlineBanner = container.querySelector('[data-mm-offline]');
    const bodyEl = container.querySelector('[data-mm-body]');
    const healthGrid = container.querySelector('[data-mm-health]');
    const debugGrid = container.querySelector('[data-mm-debug]');
    const eventsEl = container.querySelector('[data-mm-events]');
    const refreshBtn = container.querySelector('[data-mm-refresh]');

    function statusCard(label, value, cardClass, badgeState) {
      const badge = badgeState
        ? '<span class="state-badge" data-state="' + badgeState + '">' + escapeHtml(value) + '</span>'
        : '<span class="mcp-monitor-card-value">' + escapeHtml(value) + '</span>';
      return '<div class="status-card' + (cardClass ? ' ' + cardClass : '') + '">' +
        '<div class="status-label">' + escapeHtml(label) + '</div>' +
        '<div class="status-value">' + badge + '</div></div>';
    }

    function renderHealth(snap) {
      const h = snap?.health || {};
      const sock = socketState(h.socket?.connected);
      const rest = restState(h.rest?.status);
      const updated = snap?.updatedAt
        ? new Date(snap.updatedAt).toLocaleTimeString()
        : '—';

      healthGrid.innerHTML =
        statusCard('Socket', sock.label, sock.state === 'playing' ? 'status-success' : '', sock.state) +
        statusCard('REST', rest.label, rest.state === 'playing' ? 'status-success' : '', rest.state) +
        statusCard('Updated', updated, '', null);
    }

    function renderDebug(snap) {
      const stats = snap?.debug?.stats || socketDebugStats || {};
      const timing = snap?.debug?.resolveTiming || {};
      const uptime = stats.uptime != null ? Math.round(stats.uptime / 1000) + 's' : '—';

      debugGrid.innerHTML =
        statusCard('Uptime', uptime, '', null) +
        statusCard('Resolve A', formatTiming(timing, 'A'), '', null) +
        statusCard('Resolve B', formatTiming(timing, 'B'), '', null);
    }

    function renderEvents(snap) {
      const events = Array.isArray(snap?.events) ? snap.events : [];
      if (events.length === 0) {
        eventsEl.innerHTML = '<p class="list-empty">Sin eventos recientes</p>';
        return;
      }

      eventsEl.innerHTML = events.slice(0, maxEvents).map(function (ev, i) {
        const detail = ev.detail || '';
        const ts = ev.ts ? '<span class="mcp-monitor-event-ts">' + escapeHtml(ev.ts) + '</span>' : '';
        return '<button type="button" class="mcp-monitor-event list-item" data-event-idx="' + i + '">' +
          '<span class="badge badge-primary">' + escapeHtml(ev.type || 'event') + '</span>' +
          '<span class="mcp-monitor-event-detail">' + escapeHtml(detail) + '</span>' +
          ts + '</button>';
      }).join('');

      eventsEl.querySelectorAll('[data-event-idx]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const idx = Number(btn.dataset.eventIdx);
          const ev = events[idx];
          if (typeof options.onEventClick === 'function') {
            options.onEventClick(ev, idx);
          }
        });
      });
    }

    function setConnectionBadge() {
      if (connBadge) {
        if (available) {
          connBadge.textContent = 'online';
          connBadge.dataset.state = 'playing';
        } else {
          connBadge.textContent = 'offline';
          connBadge.dataset.state = 'warning';
        }
      }
    }

    function render() {
      setConnectionBadge();

      if (!available) {
        offlineBanner.hidden = false;
        bodyEl.hidden = true;
        return;
      }

      offlineBanner.hidden = true;
      bodyEl.hidden = false;
      if (!snapshot) return;

      renderHealth(snapshot);
      renderDebug(snapshot);
      renderEvents(snapshot);
    }

    async function refresh() {
      try {
        const data = await options.fetchSnapshot();
        if (data && data.available === false) {
          available = false;
          snapshot = null;
        } else {
          available = true;
          snapshot = data;
        }
      } catch {
        available = false;
        snapshot = null;
      }
      render();
    }

    function setDebugStats(payload) {
      socketDebugStats = payload;
      if (available && snapshot) {
        renderDebug(snapshot);
      } else if (!available && socketDebugStats) {
        offlineBanner.hidden = false;
        bodyEl.hidden = false;
        healthGrid.innerHTML = '';
        renderDebug({ debug: { stats: socketDebugStats } });
        eventsEl.innerHTML = '<p class="list-empty">Eventos requieren monitor MCP (:3014)</p>';
      }
    }

    refreshBtn.addEventListener('click', refresh);

    if (options.pollIntervalMs > 0) {
      pollTimer = setInterval(refresh, options.pollIntervalMs);
    }

    refresh();

    return {
      refresh: refresh,
      setDebugStats: setDebugStats,
      destroy: function () {
        if (pollTimer) clearInterval(pollTimer);
      },
      isAvailable: function () { return available; },
      getSnapshot: function () { return snapshot; }
    };
  }

  global.ZeusMcpMonitor = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
