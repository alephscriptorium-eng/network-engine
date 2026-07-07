/**
 * Zeus DJ deck — socket.io client for /session namespace.
 * DOM contract defined in src/views/deck_view.mjs.
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

  let sliderDragging = false;

  function formatResolved(resolved) {
    if (!resolved) return '—';
    const parts = [];
    const nodo = resolved.nodo?.nodo ?? resolved.nodo;
    if (nodo?.id) {
      parts.push(`nodo: ${nodo.id} — ${nodo.etiqueta || ''}`);
    } else if (resolved.nodo?.error) {
      parts.push(`nodo: ${resolved.nodo.error}`);
    }
    if (resolved.oldid?.oldid != null) {
      parts.push(`oldid: ${resolved.oldid.oldid} @ ${resolved.oldid.timestamp || ''}`);
    } else if (resolved.oldid?.error) {
      parts.push(`oldid: ${resolved.oldid.error}`);
    }
    if (resolved.error) parts.push(resolved.error);
    return parts.length ? parts.join('\n') : JSON.stringify(resolved, null, 2);
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
      syncBtn.textContent = state.sync ? '🔗 Sync: ON' : '🔗 Sync: OFF';
    }

    for (const deckId of Object.keys(state.decks || {})) {
      const deck = state.decks[deckId];
      const stateEl = document.querySelector(`.deck-state[data-deck="${deckId}"]`);
      const resolvedEl = document.querySelector(`.deck-resolved[data-deck="${deckId}"]`);
      if (stateEl && deck) {
        stateEl.textContent = deck.phase || 'empty';
        stateEl.dataset.state = deck.phase || 'empty';
      }
      if (resolvedEl && deck) {
        resolvedEl.textContent = formatResolved(deck.resolved);
      }
    }
  }

  socket.on('session:state', renderState);

  socket.on('deck:resolved', (payload) => {
    const resolvedEl = document.querySelector(`.deck-resolved[data-deck="${payload.deckId}"]`);
    if (resolvedEl) {
      resolvedEl.textContent = formatResolved(payload);
    }
  });

  socket.on('connect', () => console.log('Session socket connected'));
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

  if (syncBtn) {
    syncBtn.addEventListener('click', () => socket.emit('sync:toggle'));
  }
  if (playBtn) {
    playBtn.addEventListener('click', () => socket.emit('transport:play'));
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => socket.emit('transport:pause'));
  }

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
})();
