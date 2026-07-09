/**
 * REST poller for player-ui health and ALEPH endpoints.
 */

export function createRestPoller({ baseUrl, defaultCaso, defaultLinea = 'espana', intervalMs = 7000 }) {
  const state = {
    health: null,
    servers: null,
    anchors: null,
    anchorsLineaId: defaultLinea,
    medicion: null,
    alephConfig: null,
    alephTopology: null,
    presets: null,
    medicionByCaso: {},
    lastFetchAt: null,
    lastError: null,
    fetching: false
  };

  let timer = null;
  let listeners = new Set();

  function notify() {
    for (const fn of listeners) fn(state);
  }

  async function fetchJson(path) {
    const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
    return res.json();
  }

  async function pollOnce() {
    if (state.fetching) return;
    state.fetching = true;
    try {
      const [
        health,
        servers,
        anchors,
        medicion,
        alephConfig,
        alephTopology,
        presets
      ] = await Promise.allSettled([
        fetchJson('/health'),
        fetchJson('/api/servers'),
        fetchJson(`/api/aleph/anchors?linea=${encodeURIComponent(state.anchorsLineaId)}`),
        fetchJson(`/api/aleph/medicion/${encodeURIComponent(defaultCaso)}`),
        fetchJson('/api/aleph/config'),
        fetchJson('/api/aleph/topology'),
        fetchJson('/api/presets')
      ]);

      state.health = health.status === 'fulfilled' ? health.value : { error: health.reason?.message };
      state.servers = servers.status === 'fulfilled' ? servers.value : null;
      state.anchors = anchors.status === 'fulfilled' ? anchors.value : { error: anchors.reason?.message };
      state.medicion = medicion.status === 'fulfilled' ? medicion.value : { error: medicion.reason?.message };
      if (state.medicion && !state.medicion.error) {
        state.medicionByCaso[defaultCaso] = state.medicion;
      }
      state.alephConfig = alephConfig.status === 'fulfilled' ? alephConfig.value : { error: alephConfig.reason?.message };
      state.alephTopology = alephTopology.status === 'fulfilled' ? alephTopology.value : { error: alephTopology.reason?.message };
      state.presets = presets.status === 'fulfilled' ? presets.value : null;
      state.lastFetchAt = Date.now();
      state.lastError = null;
    } catch (err) {
      state.lastError = err.message;
    } finally {
      state.fetching = false;
      notify();
    }
  }

  return {
    getState: () => state,
    onUpdate: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    start() {
      pollOnce();
      timer = setInterval(pollOnce, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    pollOnce,
    async fetchAnchors(lineaId = state.anchorsLineaId || defaultLinea) {
      try {
        const data = await fetchJson(`/api/aleph/anchors?linea=${encodeURIComponent(lineaId)}`);
        state.anchors = data;
        state.anchorsLineaId = lineaId;
        notify();
        return data;
      } catch (err) {
        return { error: err.message, linea: { id: lineaId } };
      }
    },
    async fetchMedicion(casoId) {
      if (casoId === defaultCaso && state.medicion) return state.medicion;
      if (state.medicionByCaso?.[casoId]) return state.medicionByCaso[casoId];
      try {
        const data = await fetchJson(`/api/aleph/medicion/${encodeURIComponent(casoId)}`);
        state.medicionByCaso = state.medicionByCaso || {};
        state.medicionByCaso[casoId] = data;
        if (casoId === defaultCaso) {
          state.medicion = data;
        }
        notify();
        return data;
      } catch (err) {
        return { error: err.message, caso_id: casoId };
      }
    }
  };
}
