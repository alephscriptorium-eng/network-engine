/**
 * Async wait helpers over state-store updates and typed event ring buffer.
 */

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * @param {ReturnType<import('./state-store.mjs').createStateStore>} stateStore
 */
export function createSessionWait(stateStore) {
  /**
   * @param {{ predicate: (snap: ReturnType<typeof stateStore.getSnapshot>) => boolean, timeoutMs?: number }} opts
   */
  async function waitFor({ predicate, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const start = Date.now();
    const snapshot = () => stateStore.getSnapshot();

    if (predicate(snapshot())) {
      return { ok: true, waitedMs: 0, lastSnapshot: snapshot() };
    }

    return new Promise((resolve) => {
      let timer = null;

      const finish = (result) => {
        clearTimeout(timer);
        off();
        resolve(result);
      };

      const off = stateStore.onUpdate(() => {
        const snap = snapshot();
        if (predicate(snap)) {
          finish({ ok: true, waitedMs: Date.now() - start, lastSnapshot: snap });
        }
      });

      timer = setTimeout(() => {
        finish({
          ok: false,
          reason: 'timeout',
          waitedMs: Date.now() - start,
          lastSnapshot: snapshot()
        });
      }, timeoutMs);
    });
  }

  function waitForPlayhead(year, opts = {}) {
    const { tolerance = 0.001, timeoutMs } = opts;
    return waitFor({
      timeoutMs,
      predicate: (snap) => {
        const y = snap?.session?.playhead?.year;
        return typeof y === 'number' && Math.abs(y - year) <= tolerance;
      }
    });
  }

  function waitForDeckResolve(deckId, opts = {}) {
    const { year, nodoId, timeoutMs } = opts;
    return waitFor({
      timeoutMs,
      predicate: (snap) => {
        const deck = snap?.session?.decks?.[deckId] ?? snap?.decks?.[deckId];
        const resolved = deck?.resolved;
        if (!resolved) return false;
        if (year != null && resolved.year !== year) return false;
        const nid = resolved?.nodo?.nodo?.id || resolved?.nodo?.id;
        if (nodoId != null && nid !== nodoId) return false;
        return true;
      }
    });
  }

  function waitForWikitextCached(deckId, oldid, opts = {}) {
    const { timeoutMs } = opts;
    return waitFor({
      timeoutMs,
      predicate: (snap) => {
        const events = snap?.events ?? [];
        const eventMatch = events.find(
          (e) =>
            e.type === 'wikitext:poll-result' &&
            e.payload?.cached === true &&
            Number(e.payload?.oldid) === Number(oldid)
        );
        if (eventMatch) return true;

        const deck = snap?.session?.decks?.[deckId] ?? snap?.decks?.[deckId];
        const wt = deck?.resolved?.wikitext;
        return wt?.cached === true && Number(wt?.oldid ?? oldid) === Number(oldid);
      }
    });
  }

  function waitForActiveCaso(casoId, opts = {}) {
    const { timeoutMs } = opts;
    return waitFor({
      timeoutMs,
      predicate: (snap) => snap?.session?.activeCaso === casoId
    });
  }

  return {
    waitFor,
    waitForPlayhead,
    waitForDeckResolve,
    waitForWikitextCached,
    waitForActiveCaso
  };
}
