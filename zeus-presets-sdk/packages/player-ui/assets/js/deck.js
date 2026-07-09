/**
 * Zeus Tablero ALEPH — socket.io client + LED strip + crossover + drawer.
 */

(function () {
  const socket = io('/session', { transports: ['websocket', 'polling'] });

  const slider = document.getElementById('playhead-slider');
  const playheadValue = document.getElementById('playhead-value');
  const sessionDump = document.getElementById('session-dump');
  const sessionPhase = document.getElementById('session-phase');
  const syncBtn = document.getElementById('sync-toggle');
  const playBtn = document.getElementById('transport-play');
  const pauseBtn = document.getElementById('transport-pause');
  const casoSelect = document.getElementById('caso-select');
  const vuMeters = document.getElementById('vu-meters');
  const crossoverPregunta = document.getElementById('crossover-pregunta');
  const crossoverTesis = document.getElementById('crossover-tesis');
  const anchorStrip = document.getElementById('anchor-strip');
  const anchorSummary = document.getElementById('anchor-summary');
  const viajeStats = document.getElementById('viaje-stats');
  const topologyGraph = document.getElementById('topology-graph');
  const sessionToggle = document.getElementById('session-toggle');
  const sessionLogBody = document.getElementById('session-log-body');

  let sliderDragging = false;
  let alephConfig = null;
  let anchorCells = [];
  let currentMedicion = null;
  let selectedRegistroOldid = null;

  const LED_STATUS_CLASS = { cached: 'success', stub: 'warning', missing: 'neutral' };
  const BADGE_VARIANT = { anchor: 'primary', cached: 'success', milestone: 'accent', curated: 'warning' };
  let wikitextPollTimer = null;
  let wikitextPollOldid = null;
  const WIKITEXT_POLL_MS = 2000;
  const WIKITEXT_POLL_TIMEOUT_MS = 60000;

  function resolveWikitextOldid(resolved) {
    if (resolved?.wikitext?.oldid != null) return Number(resolved.wikitext.oldid);
    if (resolved?.selected?.oldid != null) return Number(resolved.selected.oldid);
    if (selectedRegistroOldid != null) return selectedRegistroOldid;
    if (resolved?.registros?.anchor?.oldid != null) return Number(resolved.registros.anchor.oldid);
    return null;
  }

  function isRegistroCached(resolved, oldid) {
    if (oldid == null) return false;
    const oid = Number(oldid);
    const selected = resolved?.selected;
    if (selected?.oldid === oid && selected.cached) return true;
    const item = resolved?.registros?.items?.find((r) => r.oldid === oid);
    return Boolean(item?.cached);
  }

  function isWikitextCached(resolved) {
    if (resolved?.wikitext?.cached === true) return true;
    return isRegistroCached(resolved, resolveWikitextOldid(resolved));
  }

  function shouldShowCacheButton(resolved) {
    if (isWikitextCached(resolved)) return false;
    const wt = resolved?.wikitext;
    if (!wt || wt.cached) return false;
    const oid = resolveWikitextOldid(resolved);
    if (oid == null || isRegistroCached(resolved, oid)) return false;
    return wt.action?.tool === 'cache_wikitext';
  }

  function setCacheButtonVisible(deckId, visible, oldid = null) {
    const cacheBtn = document.querySelector(`.btn-cache-wikitext[data-deck="${deckId}"]`);
    if (!cacheBtn) return;
    cacheBtn.hidden = !visible;
    cacheBtn.disabled = false;
    cacheBtn.textContent = 'Cachear';
    cacheBtn.dataset.oldid = visible && oldid != null ? String(oldid) : '';
  }

  function stopWikitextPoll() {
    if (wikitextPollTimer) {
      clearInterval(wikitextPollTimer);
      wikitextPollTimer = null;
    }
    wikitextPollOldid = null;
  }

  function startWikitextPoll(deckId, oldid) {
    stopWikitextPoll();
    wikitextPollOldid = oldid;
    const startedAt = Date.now();
    wikitextPollTimer = setInterval(() => {
      if (Date.now() - startedAt > WIKITEXT_POLL_TIMEOUT_MS) {
        stopWikitextPoll();
        const statusEl = document.querySelector(`.wikitext-status[data-deck="${deckId}"]`);
        if (statusEl) statusEl.textContent = 'Timeout esperando caché';
        return;
      }
      socket.emit('wikitext:poll', { deckId, oldid });
    }, WIKITEXT_POLL_MS);
    socket.emit('wikitext:poll', { deckId, oldid });
  }

  function updateWikitextBar(deckId, resolved) {
    const statusEl = document.querySelector(`.wikitext-status[data-deck="${deckId}"]`);
    const previewEl = document.querySelector(`.wikitext-preview[data-deck="${deckId}"]`);
    const wt = resolved?.wikitext;

    if (!statusEl && !previewEl) return;

    if (isWikitextCached(resolved)) {
      if (statusEl) statusEl.textContent = `wikitext: ${wt?.bytes ?? 0} bytes`;
      setCacheButtonVisible(deckId, false);
      if (previewEl) {
        previewEl.textContent = wt?.preview || '';
      }
      if (wikitextPollOldid === resolveWikitextOldid(resolved)) {
        stopWikitextPoll();
        loadAlephData();
      }
      return;
    }

    if (wt && !wt.cached) {
      const oid = resolveWikitextOldid(resolved);
      if (statusEl) {
        statusEl.textContent = oid
          ? `${wt.error || 'not cached'} · oldid ${oid}`
          : (wt.error || 'not cached');
      }
      if (previewEl) previewEl.textContent = '';
      setCacheButtonVisible(deckId, shouldShowCacheButton(resolved), oid);
      return;
    }

    if (statusEl) statusEl.textContent = '';
    setCacheButtonVisible(deckId, false);
    if (previewEl) previewEl.textContent = '';
  }

  function formatDeckASummary(resolved) {
    if (!resolved) return '—';
    const nodo = resolved.nodo?.nodo ?? resolved.nodo;
    if (nodo?.id) {
      return `Periodo Villacañas: ${nodo.id} — ${nodo.etiqueta || ''}\n${nodo.tesis_villacañas || nodo.tesis || ''}`;
    }
    if (resolved.nodo?.error) return `nodo: ${resolved.nodo.error}`;
    return '—';
  }

  function formatDeckBSummary(resolved) {
    if (!resolved) return '—';
    const nodo = resolved.nodo?.nodo ?? resolved.nodo;
    const reg = resolved.registros;
    const lines = [];
    if (nodo?.id) {
      lines.push(`Revisiones WP sobre ${nodo.id} (${nodo.etiqueta || ''})`);
    }
    if (reg?.total != null) {
      lines.push(`${reg.total} registros · ${reg.cached_count ?? 0} cacheados`);
    } else if (reg?.error) {
      lines.push(reg.error);
    }
    if (resolved.wikitext) {
      if (resolved.wikitext.cached) {
        lines.push(`wikitext: ${resolved.wikitext.bytes} bytes`);
      } else {
        lines.push(`wikitext: ${resolved.wikitext.error || 'not cached'}`);
      }
    }
    return lines.length ? lines.join('\n') : '—';
  }

  function badgeHtml(label, cls) {
    const variant = BADGE_VARIANT[cls] || cls;
    return `<span class="badge badge-${variant}">${label}</span>`;
  }

  function renderRegistrosList(deckId, resolved) {
    const listEl = document.querySelector(`.registros-list[data-deck="${deckId}"]`);
    const previewEl = document.querySelector(`.wikitext-preview[data-deck="${deckId}"]`);
    if (!listEl) return;

    const reg = resolved?.registros;
    if (!reg || reg.error) {
      listEl.innerHTML = `<p class="list-empty">${reg?.error || 'Sin datos de registros'}</p>`;
      if (previewEl) previewEl.textContent = '';
      return;
    }
    if (reg.total === 0) {
      listEl.innerHTML = '<p class="list-empty">No hay registros para las secciones mapeadas</p>';
      if (previewEl) previewEl.textContent = '';
      return;
    }

    const items = reg.items || [];
    listEl.innerHTML = items.map(item => {
      const badges = [];
      if (item.is_anchor) badges.push(badgeHtml('ancla', 'anchor'));
      if (item.cached) badges.push(badgeHtml('cached', 'cached'));
      if (item.milestone) badges.push(badgeHtml('milestone', 'milestone'));
      if (item.curated) badges.push(badgeHtml('curated', 'curated'));
      const selected = selectedRegistroOldid === item.oldid ? ' selected' : '';
      return `<button type="button" class="list-item registro-item${selected}${item.is_anchor ? ' is-highlight' : ''}"
        data-oldid="${item.oldid}" data-registro-id="${item.registro_id || ''}"
        data-cached="${item.cached ? 'true' : 'false'}"
        title="${item.section || ''}">
        <span class="registro-id">${item.registro_id}</span>
        <span class="registro-meta">${item.timestamp || ''} · ${item.section || '—'}</span>
        <span class="registro-badges">${badges.join('')}</span>
      </button>`;
    }).join('');

    listEl.querySelectorAll('.registro-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const oldid = Number(btn.dataset.oldid);
        selectedRegistroOldid = oldid;
        stopWikitextPoll();
        listEl.querySelectorAll('.registro-item').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (btn.dataset.cached === 'true') {
          setCacheButtonVisible(deckId, false);
        }
        socket.emit('registro:select', {
          deckId,
          oldid,
          registro_id: btn.dataset.registroId || undefined
        });
      });
    });

    updateWikitextBar(deckId, resolved);
  }

  function formatResolved(resolved, deckId) {
    if (deckId === 'A') return formatDeckASummary(resolved);
    if (deckId === 'B') return formatDeckBSummary(resolved);
    if (!resolved) return '—';
    return JSON.stringify(resolved, null, 2);
  }

  function updateCrossoverTesis(state) {
    const deckA = state?.decks?.A;
    const resolved = deckA?.resolved;
    const nodo = resolved?.nodo?.nodo ?? resolved?.nodo;
    if (nodo?.tesis_villacañas || nodo?.tesis) {
      crossoverTesis.textContent = `${nodo.id}: ${nodo.tesis_villacañas || nodo.tesis}`;
    } else if (nodo?.etiqueta) {
      crossoverTesis.textContent = `${nodo.id} — ${nodo.etiqueta}`;
    }
  }

  function renderVuMeters(medicion) {
    if (!vuMeters || !medicion?.latest) {
      if (vuMeters) vuMeters.textContent = '—';
      return;
    }
    const latest = medicion.latest;
    const baseline = medicion.mediciones?.baseline;
    const ejes = latest.ejes || {};
    const baseEjes = baseline?.ejes || {};

    const rows = [
      { key: 'intensidad', label: 'Intensidad', val: latest.intensidad, base: baseline?.intensidad ?? 5 },
      { key: 'pluralidad', label: 'Pluralidad', val: ejes.pluralidad, base: baseEjes.pluralidad ?? 5 },
      { key: 'legitimidad', label: 'Legitimidad', val: ejes.legitimidad, base: baseEjes.legitimidad ?? 5 },
      { key: 'continuidad', label: 'Continuidad', val: ejes.continuidad, base: baseEjes.continuidad ?? 5 },
      { key: 'capacidad', label: 'Capacidad', val: ejes.capacidad, base: baseEjes.capacidad ?? 5 }
    ];

    vuMeters.innerHTML = rows.map(r => {
      const v = Number(r.val) || 0;
      const pct = Math.min(100, Math.max(0, (v / 10) * 100));
      const delta = (v - (Number(r.base) || 5)).toFixed(2);
      const sign = Number(delta) >= 0 ? '+' : '';
      return `<div class="vu-row"><span class="vu-label">${r.label}</span>
        <div class="vu-bar"><div class="vu-fill" style="width:${pct}%"></div></div>
        <span class="vu-value">${v?.toFixed?.(2) ?? v} (${sign}${delta})</span></div>`;
    }).join('');

    if (latest.lectura) {
      vuMeters.innerHTML += `<p class="vu-lectura">${latest.id}: ${latest.lectura}</p>`;
    }
  }

  function renderAnchorStrip(grid) {
    if (!anchorStrip || !grid?.cells) return;
    anchorCells = grid.cells;
    anchorStrip.innerHTML = grid.cells.map(cell => {
      const title = cell.note
        ? `${cell.note} · hist ${cell.year}${cell.wp_year ? ` · WP ${cell.wp_year}` : ''}`
        : cell.nodo_id;
      const ledStatus = LED_STATUS_CLASS[cell.status] || 'neutral';
      return `<button type="button" class="status-led status-${ledStatus}"
        data-px="${cell.nodo_id}" data-year="${cell.year || ''}" data-oldid="${cell.oldid}"
        title="${title}">${cell.nodo_id.replace('P', '')}</button>`;
    }).join('');

    anchorStrip.querySelectorAll('.status-led').forEach(btn => {
      btn.addEventListener('click', () => {
        const year = Number(btn.dataset.year);
        const oldid = Number(btn.dataset.oldid);
        if (!year) return;
        if (slider) slider.value = String(year);
        if (playheadValue) playheadValue.textContent = String(year);
        selectedRegistroOldid = oldid;
        socket.emit('playhead:set', { year });
        if (oldid) {
          socket.emit('registro:select', { deckId: 'B', oldid });
        }
      });
    });

    if (anchorSummary && grid.summary) {
      const s = grid.summary;
      anchorSummary.textContent =
        `Wave A: ${s.cached} cached · ${s.stub} stub · ${s.missing} missing (${s.total} anclas)`;
    }
  }

  function renderViajeStats(cacheStats, grid) {
    if (!viajeStats) return;
    if (!cacheStats || cacheStats.error) {
      viajeStats.textContent = cacheStats?.error || 'Caché no disponible';
      return;
    }
    const pct = cacheStats.coverage_pct ?? 0;
    const wave = grid?.summary;
    viajeStats.innerHTML = `
      <dl class="stats-dl">
        <dt>Cobertura</dt><dd>${pct}%</dd>
        <dt>Wikitexts cacheados</dt><dd>${cacheStats.cached_wikitexts ?? 0} / ${cacheStats.registro_count ?? 0}</dd>
        <dt>Milestones sin cuerpo</dt><dd>${cacheStats.milestones_sin_cuerpo ?? '—'}</dd>
        <dt>Wave A progreso</dt><dd>${wave ? `${wave.cached + wave.stub}/${wave.total}` : '—'}</dd>
      </dl>`;
  }

  function renderTopology(data) {
    if (!topologyGraph || !data?.nodes) return;
    const nodes = data.nodes.map(n =>
      `<div class="service-node"><strong>${n.id}</strong>
        <span class="badge badge-${n.role}">${n.role}</span>
        ${n.port ? `<p class="node-port">:${n.port}</p>` : ''}
        ${n.coverage ? `<p class="node-cov">${n.coverage}</p>` : ''}
      </div>`
    ).join('');
    const lanes = data.lanes ? `
      <div class="topology-lanes">
        <div class="lane"><h4>Composer</h4><ol>${data.lanes.composer.map(s => `<li>${s}</li>`).join('')}</ol></div>
        <div class="lane"><h4>Reader</h4><ol>${data.lanes.reader.map(s => `<li>${s}</li>`).join('')}</ol></div>
      </div>` : '';
    topologyGraph.innerHTML = `<div class="topology-graph">${nodes}</div>${lanes}`;
  }

  async function loadAlephData() {
    try {
      const [configRes, anchorsRes, topoRes] = await Promise.all([
        fetch('/api/aleph/config'),
        fetch('/api/aleph/anchors'),
        fetch('/api/aleph/topology')
      ]);
      alephConfig = await configRes.json();
      const anchorsData = await anchorsRes.json();
      const topoData = await topoRes.json();

      if (crossoverPregunta && alephConfig.preguntas) {
        const caso = casoSelect?.value || alephConfig.defaultCaso;
        crossoverPregunta.textContent = alephConfig.preguntas[caso] || '—';
      }

      renderAnchorStrip(anchorsData.grid);
      renderViajeStats(anchorsData.cacheStats, anchorsData.grid);
      renderTopology(topoData);

      const casoId = casoSelect?.value || alephConfig.defaultCaso;
      await loadMedicion(casoId);
    } catch (err) {
      console.error('ALEPH data load failed:', err);
    }
  }

  async function loadMedicion(casoId) {
    try {
      const res = await fetch(`/api/aleph/medicion/${encodeURIComponent(casoId)}`);
      if (!res.ok) {
        currentMedicion = null;
        renderVuMeters(null);
        return;
      }
      currentMedicion = await res.json();
      renderVuMeters(currentMedicion);
      if (crossoverPregunta && alephConfig?.preguntas) {
        crossoverPregunta.textContent = alephConfig.preguntas[casoId] || '—';
      }
    } catch (err) {
      console.error('Medicion load failed:', err);
    }
  }

  function updateDeckResolved(deckId, resolved) {
    const summaryEl = document.querySelector(`.deck-b-summary[data-deck="${deckId}"]`);
    const resolvedEl = document.querySelector(`.deck-resolved[data-deck="${deckId}"]`);
    if (deckId === 'B') {
      if (summaryEl) summaryEl.textContent = formatDeckBSummary(resolved);
      renderRegistrosList(deckId, resolved);
    } else if (resolvedEl) {
      resolvedEl.textContent = formatResolved(resolved, deckId);
    }
  }

  function renderState(state) {
    if (sessionDump) {
      sessionDump.textContent = JSON.stringify(state, null, 2);
    }
    if (sessionPhase) {
      sessionPhase.textContent = typeof state.phase === 'string'
        ? state.phase
        : JSON.stringify(state.phase);
    }
    if (playheadValue && state.playhead) {
      playheadValue.textContent = String(state.playhead.year);
    }
    if (slider && state.playhead && !sliderDragging) {
      slider.value = String(state.playhead.year);
    }
    if (casoSelect && state.activeCaso && casoSelect.value !== state.activeCaso) {
      casoSelect.value = state.activeCaso;
      loadMedicion(state.activeCaso);
    }
    if (syncBtn) {
      syncBtn.textContent = state.sync ? 'Sync: ON' : 'Sync: OFF';
    }

    for (const deckId of Object.keys(state.decks || {})) {
      const deck = state.decks[deckId];
      const stateEl = document.querySelector(`.deck-state[data-deck="${deckId}"]`);
      const panel = document.querySelector(`.deck-panel[data-deck-id="${deckId}"]`);
      if (stateEl && deck) {
        stateEl.textContent = deck.phase || 'empty';
        stateEl.dataset.state = deck.phase || 'empty';
      }
      if (panel) {
        panel.classList.toggle('deck-degraded', deck.phase === 'degraded');
      }
      if (deck.resolved) {
        updateDeckResolved(deckId, deck.resolved);
      }
    }

    updateCrossoverTesis(state);
  }

  const DEFAULT_SERVER_BY_DECK = { A: 'linea-espana', B: 'linea-wp-historia' };

  function populateServerSelects(servers) {
    if (!Array.isArray(servers)) return;
    document.querySelectorAll('.deck-server').forEach((select) => {
      const defaultServer = select.dataset.defaultServer
        || DEFAULT_SERVER_BY_DECK[select.dataset.deck];
      const previous = select.value;

      select.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '(elegir servidor)';
      select.appendChild(placeholder);

      for (const server of servers) {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = server.name || server.id;
        select.appendChild(option);
      }

      const pick = [previous, defaultServer].find(
        (id) => id && servers.some((s) => s.id === id)
      );
      if (pick) select.value = pick;
    });
  }

  function ensureDeckServerSelected(deckId) {
    const select = document.querySelector(`.deck-server[data-deck="${deckId}"]`);
    if (!select || select.value) return select?.value || '';
    const fallback = select.dataset.defaultServer || DEFAULT_SERVER_BY_DECK[deckId];
    if (fallback && [...select.options].some((opt) => opt.value === fallback)) {
      select.value = fallback;
    }
    return select.value;
  }

  function autoLoadDecks() {
    document.querySelectorAll('.deck-load').forEach((btn) => {
      ensureDeckServerSelected(btn.dataset.deck);
      btn.click();
    });
  }

  socket.on('catalog:servers', populateServerSelects);
  socket.on('session:state', renderState);

  socket.on('deck:resolved', (payload) => {
    updateDeckResolved(payload.deckId, payload);
    if (payload.deckId === 'B' && payload.wikitext?.cached) {
      stopWikitextPoll();
    }
    if (payload.deckId === 'A' && crossoverTesis) {
      const nodo = payload.nodo?.nodo ?? payload.nodo;
      const tesis = nodo?.tesis_villacañas || nodo?.tesis;
      if (tesis) crossoverTesis.textContent = `${nodo.id}: ${tesis}`;
    }
  });

  socket.on('wikitext:cache-result', (payload) => {
    const deckId = 'B';
    const statusEl = document.querySelector(`.wikitext-status[data-deck="${deckId}"]`);
    if (!payload?.ok) {
      if (statusEl) statusEl.textContent = payload?.error || 'Error al cachear';
      return;
    }
    if (payload.status === 'cached' && payload.skipped) {
      setCacheButtonVisible(deckId, false);
      if (statusEl) statusEl.textContent = `wikitext: ya cacheado (oldid ${payload.oldid})`;
      socket.emit('wikitext:poll', { deckId, oldid: payload.oldid });
      return;
    }
    if (statusEl) statusEl.textContent = `Cacheando oldid ${payload.oldid}…`;
    const cacheBtn = document.querySelector(`.btn-cache-wikitext[data-deck="${deckId}"]`);
    if (cacheBtn) {
      cacheBtn.hidden = false;
      cacheBtn.disabled = true;
      cacheBtn.textContent = 'Cacheando…';
    }
    startWikitextPoll(deckId, payload.oldid);
  });

  socket.on('wikitext:poll-result', (payload) => {
    if (!payload?.cached) return;
    stopWikitextPoll();
    setCacheButtonVisible('B', false);
  });

  document.querySelectorAll('.btn-cache-wikitext').forEach((btn) => {
    btn.addEventListener('click', () => {
      const deckId = btn.dataset.deck || 'B';
      const oldid = Number(btn.dataset.oldid);
      if (!oldid) return;
      btn.disabled = true;
      btn.textContent = 'Cacheando…';
      socket.emit('wikitext:cache', { deckId, oldid });
    });
  });

  socket.on('connect', async () => {
    console.log('Session socket connected');
    try {
      const res = await fetch('/api/servers');
      if (res.ok) populateServerSelects(await res.json());
    } catch (error) {
      console.warn('Failed to refresh server list:', error);
    }
    await loadAlephData();
    autoLoadDecks();
  });
  socket.on('disconnect', () => console.log('Session socket disconnected'));

  if (slider) {
    slider.addEventListener('input', () => {
      sliderDragging = true;
      if (playheadValue) playheadValue.textContent = slider.value;
    });
    slider.addEventListener('change', () => {
      sliderDragging = false;
      selectedRegistroOldid = null;
      stopWikitextPoll();
      socket.emit('playhead:set', { year: Number(slider.value) });
    });
  }

  document.querySelectorAll('.cue-mark').forEach((mark) => {
    mark.addEventListener('click', () => {
      const year = Number(mark.dataset.year);
      if (slider) slider.value = String(year);
      if (playheadValue) playheadValue.textContent = String(year);
      selectedRegistroOldid = null;
      socket.emit('playhead:set', { year });
    });
  });

  if (syncBtn) syncBtn.addEventListener('click', () => socket.emit('sync:toggle'));
  if (playBtn) playBtn.addEventListener('click', () => socket.emit('transport:play'));
  if (pauseBtn) pauseBtn.addEventListener('click', () => socket.emit('transport:pause'));

  document.querySelectorAll('.deck-load').forEach((btn) => {
    btn.addEventListener('click', () => {
      const deckId = btn.dataset.deck;
      const serverSelect = document.querySelector(`.deck-server[data-deck="${deckId}"]`);
      const presetSelect = document.querySelector(`.deck-preset[data-deck="${deckId}"]`);
      const serverName = serverSelect?.value;
      if (!serverName) return;
      const presetId = presetSelect?.value || undefined;
      socket.emit('deck:load', { deckId, serverName, presetId });
    });
  });

  if (casoSelect) {
    casoSelect.addEventListener('change', () => {
      const casoId = casoSelect.value;
      loadMedicion(casoId);
      socket.emit('caso:set', { casoId });
    });
  }

  document.querySelectorAll('.drawer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panelId = tab.dataset.tab;
      document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.drawer-content').forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });
      tab.classList.add('active');
      const panel = document.querySelector(`[data-panel="${panelId}"]`);
      if (panel) {
        panel.classList.add('active');
        panel.hidden = false;
      }
      if (panelId) window.location.hash = panelId;
    });
  });

  if (sessionToggle && sessionLogBody) {
    sessionToggle.addEventListener('click', () => {
      const hidden = sessionLogBody.hidden;
      sessionLogBody.hidden = !hidden;
    });
  }

  const hash = window.location.hash.replace('#', '');
  if (hash && ['viaje', 'mcp', 'prensa'].includes(hash)) {
    document.querySelector(`.drawer-tab[data-tab="${hash}"]`)?.click();
  }

  const themeSelect = document.getElementById('nav-theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', async (e) => {
      const themeName = e.target.value;
      if (window.Zeus && typeof window.Zeus.switchTheme === 'function') {
        await window.Zeus.switchTheme(themeName);
      }
    });
  }
})();
