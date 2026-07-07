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

  function formatResolved(resolved) {
    if (!resolved) return '—';
    const parts = [];
    const nodo = resolved.nodo?.nodo ?? resolved.nodo;
    if (nodo?.id) {
      parts.push(`nodo: ${nodo.id} — ${nodo.etiqueta || ''}`);
      if (nodo.tesis) parts.push(`tesis: ${nodo.tesis.slice(0, 120)}…`);
    } else if (resolved.nodo?.error) {
      parts.push(`nodo: ${resolved.nodo.error}`);
    }
    if (resolved.oldid?.oldid != null) {
      parts.push(`oldid: ${resolved.oldid.oldid} @ ${resolved.oldid.timestamp || ''}`);
    } else if (resolved.oldid?.error) {
      parts.push(`oldid: ${resolved.oldid.error}`);
    }
    if (resolved.wikitext) {
      if (resolved.wikitext.cached) {
        parts.push(`wikitext: ${resolved.wikitext.bytes} bytes`);
      } else {
        parts.push(`wikitext: ${resolved.wikitext.error || 'not cached'}`);
      }
    }
    if (resolved.error) parts.push(resolved.error);
    return parts.length ? parts.join('\n') : JSON.stringify(resolved, null, 2);
  }

  function updateCrossoverTesis(state) {
    const deckA = state?.decks?.A;
    const resolved = deckA?.resolved;
    const nodo = resolved?.nodo?.nodo ?? resolved?.nodo;
    if (nodo?.tesis) {
      crossoverTesis.textContent = `${nodo.id}: ${nodo.tesis}`;
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
    anchorStrip.innerHTML = grid.cells.map(cell =>
      `<button type="button" class="anchor-led status-${cell.status}"
        data-px="${cell.nodo_id}" data-year="${cell.year || ''}"
        title="${cell.note || cell.nodo_id}">${cell.nodo_id.replace('P', '')}</button>`
    ).join('');

    anchorStrip.querySelectorAll('.anchor-led').forEach(btn => {
      btn.addEventListener('click', () => {
        const year = Number(btn.dataset.year);
        if (!year) return;
        if (slider) slider.value = String(year);
        if (playheadValue) playheadValue.textContent = String(year);
        socket.emit('playhead:set', { year });
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
    if (syncBtn) {
      syncBtn.textContent = state.sync ? 'Sync: ON' : 'Sync: OFF';
    }

    for (const deckId of Object.keys(state.decks || {})) {
      const deck = state.decks[deckId];
      const stateEl = document.querySelector(`.deck-state[data-deck="${deckId}"]`);
      const resolvedEl = document.querySelector(`.deck-resolved[data-deck="${deckId}"]`);
      const panel = document.querySelector(`.deck-panel[data-deck-id="${deckId}"]`);
      if (stateEl && deck) {
        stateEl.textContent = deck.phase || 'empty';
        stateEl.dataset.state = deck.phase || 'empty';
      }
      if (panel) {
        panel.classList.toggle('deck-degraded', deck.phase === 'degraded');
      }
      if (resolvedEl && deck) {
        resolvedEl.textContent = formatResolved(deck.resolved);
      }
    }

    updateCrossoverTesis(state);
  }

  function autoLoadDecks() {
    document.querySelectorAll('.deck-load').forEach(btn => btn.click());
  }

  socket.on('session:state', renderState);

  socket.on('deck:resolved', (payload) => {
    const resolvedEl = document.querySelector(`.deck-resolved[data-deck="${payload.deckId}"]`);
    if (resolvedEl) {
      resolvedEl.textContent = formatResolved(payload);
    }
    if (payload.deckId === 'A' && crossoverTesis) {
      const nodo = payload.nodo?.nodo ?? payload.nodo;
      if (nodo?.tesis) crossoverTesis.textContent = `${nodo.id}: ${nodo.tesis}`;
    }
  });

  socket.on('connect', () => {
    console.log('Session socket connected');
    loadAlephData().then(autoLoadDecks);
  });
  socket.on('disconnect', () => console.log('Session socket disconnected'));

  if (slider) {
    slider.addEventListener('input', () => {
      sliderDragging = true;
      if (playheadValue) playheadValue.textContent = slider.value;
    });
    slider.addEventListener('change', () => {
      sliderDragging = false;
      socket.emit('playhead:set', { year: Number(slider.value) });
    });
  }

  document.querySelectorAll('.cue-mark').forEach((mark) => {
    mark.addEventListener('click', () => {
      const year = Number(mark.dataset.year);
      if (slider) slider.value = String(year);
      if (playheadValue) playheadValue.textContent = String(year);
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
    casoSelect.addEventListener('change', () => loadMedicion(casoSelect.value));
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
})();
