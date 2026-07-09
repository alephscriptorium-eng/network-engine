/**
 * Wave A anchors explorer (browser) — multi-line grid + detail panel.
 */
(function (global) {
  'use strict';

  const STATUS_CLASS = { cached: 'success', stub: 'warning', missing: 'neutral' };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tileLabel(nodoId) {
    return String(nodoId || '').replace(/^P/i, '');
  }

  function formatSummary(summary) {
    if (!summary) return '';
    return `${summary.cached} cached · ${summary.stub} stub · ${summary.missing} missing (${summary.total} anclas)`;
  }

  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {() => Promise<{ lineas: object[] }>} options.fetchLineas
   * @param {(lineaId: string) => Promise<object>} options.fetchGrid
   * @param {string} [options.initialLineaId]
   * @param {number} [options.pollIntervalMs]
   * @param {string} [options.title]
   * @param {(payload: object) => void} [options.onAnchorNavigate]
   * @param {(payload: object) => void} [options.onCacheRequest]
   * @param {(lineaId: string) => void} [options.onLineaChange]
   * @param {string[]} [options.cacheableStatuses]
   */
  function mount(container, options) {
    if (!container || !options || typeof options.fetchGrid !== 'function') {
      throw new Error('AnchorsExplorer.mount requires container and fetchGrid');
    }

    const title = options.title || 'Wave A — anclas';
    let lineaId = options.initialLineaId || 'espana';
    let pollTimer = null;
    let activeYear = null;
    let selectedNodoId = null;
    let gridData = null;
    let lineas = [];
    let cachingOldid = null;
    const cacheableStatuses = options.cacheableStatuses || ['missing', 'stub'];

    container.innerHTML =
      '<div class="anchors-explorer" data-ae-root>' +
        '<div class="ae-header action-row">' +
          '<div class="ae-title-row">' +
            '<label class="ae-linea-label">Línea' +
              '<select class="ae-linea-select" data-ae-linea></select>' +
            '</label>' +
            '<h3 class="subsection-title ae-title">' + escapeHtml(title) + '</h3>' +
          '</div>' +
          '<div class="ae-header-actions action-row">' +
            '<span class="state-badge ae-coverage-badge" data-ae-coverage data-state="loading">—</span>' +
            '<button type="button" class="btn btn-outline btn-small" data-ae-refresh>Refresh</button>' +
          '</div>' +
        '</div>' +
        '<div class="ae-grid-host" data-ae-grid>' +
          '<p class="list-empty ae-loading">Cargando anclas…</p>' +
        '</div>' +
        '<p class="status-led-summary ae-summary" data-ae-summary></p>' +
        '<div class="inset-panel ae-detail" data-ae-detail hidden>' +
          '<div class="ae-detail-header action-row">' +
            '<h4 class="ae-detail-title" data-ae-detail-title></h4>' +
            '<div class="ae-detail-actions action-row">' +
              '<button type="button" class="btn btn-outline btn-small" data-ae-cache hidden>Cachear</button>' +
              '<button type="button" class="btn btn-outline btn-small" data-ae-navigate>Ir a ancla</button>' +
            '</div>' +
          '</div>' +
          '<p class="ae-cache-status" data-ae-cache-status hidden></p>' +
          '<dl class="stats-dl ae-detail-stats" data-ae-detail-stats></dl>' +
        '</div>' +
      '</div>';

    const lineaSelect = container.querySelector('[data-ae-linea]');
    const gridHost = container.querySelector('[data-ae-grid]');
    const summaryEl = container.querySelector('[data-ae-summary]');
    const detailEl = container.querySelector('[data-ae-detail]');
    const detailTitle = container.querySelector('[data-ae-detail-title]');
    const detailStats = container.querySelector('[data-ae-detail-stats]');
    const coverageBadge = container.querySelector('[data-ae-coverage]');
    const refreshBtn = container.querySelector('[data-ae-refresh]');
    const navigateBtn = container.querySelector('[data-ae-navigate]');
    const cacheBtn = container.querySelector('[data-ae-cache]');
    const cacheStatusEl = container.querySelector('[data-ae-cache-status]');

    function isCacheable(cell) {
      return Boolean(cell?.oldid != null && cacheableStatuses.includes(cell.status));
    }

    function updateCacheButton(cell) {
      if (!cacheBtn) return;
      const show = isCacheable(cell) && typeof options.onCacheRequest === 'function';
      cacheBtn.hidden = !show;
      if (!show) {
        cacheBtn.disabled = false;
        cacheBtn.textContent = 'Cachear';
        if (cacheStatusEl) cacheStatusEl.hidden = true;
        return;
      }
      const busy = cachingOldid != null && Number(cachingOldid) === Number(cell.oldid);
      cacheBtn.disabled = busy;
      cacheBtn.textContent = busy ? 'Cacheando…' : 'Cachear';
    }

    function renderDetail(cell) {
      if (!cell) {
        detailEl.hidden = true;
        return;
      }
      detailEl.hidden = false;
      const note = cell.note || cell.nodo_id;
      detailTitle.textContent = `${cell.nodo_id}${cell.etiqueta ? ` · ${cell.etiqueta}` : ''}`;
      detailStats.innerHTML =
        '<dt>Nota</dt><dd>' + escapeHtml(note) + '</dd>' +
        '<dt>Año histórico</dt><dd>' + escapeHtml(cell.year ?? '—') + '</dd>' +
        '<dt>Año WP</dt><dd>' + escapeHtml(cell.wp_year ?? '—') + '</dd>' +
        '<dt>oldid</dt><dd>' + escapeHtml(cell.oldid ?? '—') + '</dd>' +
        '<dt>Estado</dt><dd data-ae-status>' + escapeHtml(cell.status ?? '—') + '</dd>';
      updateCacheButton(cell);
    }

    function findCell(nodoId) {
      const cells = gridData?.grid?.cells || gridData?.cells;
      if (!Array.isArray(cells) || !nodoId) return null;
      const target = String(nodoId).toUpperCase();
      return cells.find((c) => String(c.nodo_id).toUpperCase() === target) || null;
    }

    function applyTileStates() {
      gridHost.querySelectorAll('[data-ae-tile]').forEach((btn) => {
        const nodo = btn.dataset.nodo;
        const year = Number(btn.dataset.year);
        btn.classList.toggle('selected', selectedNodoId && nodo === selectedNodoId);
        btn.classList.toggle('active', activeYear != null && year === activeYear);
      });
    }

    function renderGrid(payload) {
      gridData = payload;
      const cells = payload?.grid?.cells || payload?.cells;
      const summary = payload?.grid?.summary || payload?.summary;

      if (!Array.isArray(cells) || cells.length === 0) {
        gridHost.innerHTML = '<p class="list-empty">Sin anclas para esta línea</p>';
        summaryEl.textContent = '';
        detailEl.hidden = true;
        return;
      }

      gridHost.innerHTML = cells.map((cell) => {
        const ledStatus = STATUS_CLASS[cell.status] || 'neutral';
        const tip = cell.note
          ? `${cell.note} · hist ${cell.year}${cell.wp_year ? ` · WP ${cell.wp_year}` : ''}`
          : cell.nodo_id;
        return '<button type="button" class="ae-tile status-led status-' + ledStatus + '" ' +
          'data-ae-tile data-nodo="' + escapeHtml(cell.nodo_id) + '" ' +
          'data-year="' + escapeHtml(cell.year ?? '') + '" ' +
          'data-oldid="' + escapeHtml(cell.oldid ?? '') + '" ' +
          'title="' + escapeHtml(tip) + '">' +
          escapeHtml(tileLabel(cell.nodo_id)) +
          '</button>';
      }).join('');

      summaryEl.textContent = formatSummary(summary);

      const stats = payload?.cacheStats;
      if (stats?.coverage_pct != null) {
        coverageBadge.textContent = stats.coverage_pct + '% cache';
        coverageBadge.dataset.state = stats.coverage_pct >= 50 ? 'playing' : 'warning';
      } else if (stats?.error) {
        coverageBadge.textContent = 'offline';
        coverageBadge.dataset.state = 'degraded';
      } else {
        coverageBadge.textContent = summary ? `${summary.cached}/${summary.total}` : '—';
        coverageBadge.dataset.state = 'loading';
      }

      gridHost.querySelectorAll('[data-ae-tile]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nodo_id = btn.dataset.nodo;
          selectedNodoId = nodo_id;
          const cell = findCell(nodo_id);
          renderDetail(cell);
          applyTileStates();
        });
      });

      if (selectedNodoId) {
        renderDetail(findCell(selectedNodoId));
      }
      applyTileStates();
    }

    function populateLineas(list) {
      lineas = list || [];
      if (!lineaSelect) return;
      lineaSelect.innerHTML = lineas.map((l) =>
        '<option value="' + escapeHtml(l.id) + '">' + escapeHtml(l.etiqueta || l.id) + '</option>'
      ).join('');
      if (lineas.some((l) => l.id === lineaId)) {
        lineaSelect.value = lineaId;
      } else if (lineas[0]) {
        lineaId = lineas[0].id;
        lineaSelect.value = lineaId;
      }
    }

    async function refresh() {
      try {
        const payload = await options.fetchGrid(lineaId);
        if (payload?.error) {
          gridHost.innerHTML = '<p class="list-empty">' + escapeHtml(payload.error) + '</p>';
          return payload;
        }
        renderGrid(payload);
        if (cachingOldid != null) {
          const cell = findCell(selectedNodoId);
          if (cell && !isCacheable(cell)) {
            cachingOldid = null;
            if (cacheStatusEl) cacheStatusEl.hidden = true;
          }
          updateCacheButton(cell);
        }
        return payload;
      } catch (err) {
        gridHost.innerHTML = '<p class="list-empty">Error: ' + escapeHtml(err.message) + '</p>';
        throw err;
      }
    }

    async function init() {
      if (typeof options.fetchLineas === 'function') {
        try {
          const registry = await options.fetchLineas();
          populateLineas(registry?.lineas);
        } catch (err) {
          console.warn('[AnchorsExplorer] fetchLineas failed:', err);
        }
      }
      await refresh();
      if (options.pollIntervalMs > 0) {
        pollTimer = setInterval(() => refresh().catch(() => {}), options.pollIntervalMs);
      }
    }

    if (lineaSelect) {
      lineaSelect.addEventListener('change', async () => {
        lineaId = lineaSelect.value;
        selectedNodoId = null;
        detailEl.hidden = true;
        if (typeof options.onLineaChange === 'function') {
          options.onLineaChange(lineaId);
        }
        await refresh();
      });
    }

    refreshBtn.addEventListener('click', () => refresh());

    if (cacheBtn) {
      cacheBtn.addEventListener('click', () => {
        const cell = findCell(selectedNodoId);
        if (!cell || !isCacheable(cell) || typeof options.onCacheRequest !== 'function') return;
        cachingOldid = Number(cell.oldid);
        updateCacheButton(cell);
        if (cacheStatusEl) {
          cacheStatusEl.hidden = false;
          cacheStatusEl.textContent = `Iniciando caché oldid ${cell.oldid}…`;
        }
        options.onCacheRequest({
          lineaId,
          nodo_id: cell.nodo_id,
          oldid: Number(cell.oldid),
          cell
        });
      });
    }

    navigateBtn.addEventListener('click', () => {
      const cell = findCell(selectedNodoId);
      if (!cell?.year || typeof options.onAnchorNavigate !== 'function') return;
      options.onAnchorNavigate({
        lineaId,
        nodo_id: cell.nodo_id,
        year: Number(cell.year),
        oldid: cell.oldid != null ? Number(cell.oldid) : null,
        cell
      });
    });

    gridHost.addEventListener('dblclick', (ev) => {
      const tile = ev.target.closest('[data-ae-tile]');
      if (!tile) return;
      const cell = findCell(tile.dataset.nodo);
      if (!cell?.year || typeof options.onAnchorNavigate !== 'function') return;
      options.onAnchorNavigate({
        lineaId,
        nodo_id: cell.nodo_id,
        year: Number(cell.year),
        oldid: cell.oldid != null ? Number(cell.oldid) : null,
        cell
      });
    });

    init();

    return {
      refresh,
      setActiveYear(year) {
        activeYear = year != null ? Number(year) : null;
        applyTileStates();
      },
      setSelectedNodo(nodoId) {
        if (!nodoId) {
          selectedNodoId = null;
        } else {
          const raw = String(nodoId).trim().toUpperCase();
          selectedNodoId = raw.startsWith('P') ? raw : `P${raw}`;
        }
        renderDetail(findCell(selectedNodoId));
        applyTileStates();
      },
      getLineaId() {
        return lineaId;
      },
      getSelectedCell() {
        return findCell(selectedNodoId);
      },
      setCacheState({ oldid, state, message } = {}) {
        const oid = oldid != null ? Number(oldid) : null;
        const cell = findCell(selectedNodoId);
        if (oid != null && cell && Number(cell.oldid) !== oid) return;

        if (state === 'caching') {
          cachingOldid = oid;
          if (cacheStatusEl) {
            cacheStatusEl.hidden = false;
            cacheStatusEl.textContent = message || `Cacheando oldid ${oid}…`;
          }
        } else if (state === 'error') {
          cachingOldid = null;
          if (cacheStatusEl) {
            cacheStatusEl.hidden = false;
            cacheStatusEl.textContent = message || 'Error al cachear';
          }
        } else {
          cachingOldid = null;
          if (cacheStatusEl) cacheStatusEl.hidden = true;
        }
        updateCacheButton(cell);
      },
      destroy() {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    };
  }

  global.ZeusAnchorsExplorer = { mount };
})(typeof window !== 'undefined' ? window : globalThis);
