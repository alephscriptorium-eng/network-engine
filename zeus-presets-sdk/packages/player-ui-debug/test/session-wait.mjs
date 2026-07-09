/**
 * Unit tests for session-wait.mjs (no player-ui required).
 */

import assert from 'node:assert/strict';
import { createSessionWait } from '../src/session-wait.mjs';

function createMockStateStore(initialSession = {}) {
  let session = {
    playhead: { year: 2010, playing: false },
    phase: 'preparada',
    sync: true,
    decks: { A: { phase: 'empty', resolved: null }, B: { phase: 'empty', resolved: null } },
    ...initialSession
  };
  const events = [];
  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn();
  }

  return {
    getSnapshot: () => ({
      schemaVersion: '1.0',
      session,
      decks: session.decks,
      events
    }),
    getSession: () => session,
    onUpdate: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setPlayhead(year) {
      session = { ...session, playhead: { ...session.playhead, year } };
      notify();
    },
    setDeckResolved(deckId, resolved) {
      session = {
        ...session,
        decks: {
          ...session.decks,
          [deckId]: { ...session.decks[deckId], phase: 'cued', resolved }
        }
      };
      notify();
    },
    pushEvent(type, payload) {
      events.unshift({ ts: new Date().toISOString(), type, payload });
      notify();
    },
    setActiveCaso(casoId) {
      session = { ...session, activeCaso: casoId };
      notify();
    }
  };
}

let failed = false;

async function test(name, fn) {
  try {
    await fn();
    console.log(`OK: ${name}`);
  } catch (err) {
    failed = true;
    console.error(`FAIL: ${name}`);
    console.error(err);
  }
}

await test('waitForPlayhead resolves immediately when already at year', async () => {
  const store = createMockStateStore({ playhead: { year: 1978, playing: false } });
  const wait = createSessionWait(store);
  const result = await wait.waitForPlayhead(1978);
  assert.equal(result.ok, true);
  assert.equal(result.waitedMs, 0);
});

await test('waitForPlayhead resolves after update', async () => {
  const store = createMockStateStore();
  const wait = createSessionWait(store);
  setTimeout(() => store.setPlayhead(2026), 50);
  const result = await wait.waitForPlayhead(2026, { timeoutMs: 2000 });
  assert.equal(result.ok, true);
  assert.ok(result.waitedMs >= 0);
});

await test('waitForPlayhead times out', async () => {
  const store = createMockStateStore();
  const wait = createSessionWait(store);
  const result = await wait.waitForPlayhead(9999, { timeoutMs: 100 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'timeout');
});

await test('waitForDeckResolve matches nodo and year', async () => {
  const store = createMockStateStore();
  const wait = createSessionWait(store);
  setTimeout(() => {
    store.setPlayhead(1978);
    store.setDeckResolved('B', { year: 1978, nodo: { nodo: { id: 'P23' } } });
  }, 30);
  const result = await wait.waitForDeckResolve('B', { year: 1978, nodoId: 'P23', timeoutMs: 2000 });
  assert.equal(result.ok, true);
});

await test('waitForWikitextCached via event ring buffer', async () => {
  const store = createMockStateStore();
  const wait = createSessionWait(store);
  setTimeout(() => store.pushEvent('wikitext:poll-result', { cached: true, oldid: 12345 }), 30);
  const result = await wait.waitForWikitextCached('B', 12345, { timeoutMs: 2000 });
  assert.equal(result.ok, true);
});

await test('waitForActiveCaso', async () => {
  const store = createMockStateStore({ activeCaso: 'aeo-p24-linea' });
  const wait = createSessionWait(store);
  setTimeout(() => store.setActiveCaso('aeo-tronco-caso1'), 40);
  const result = await wait.waitForActiveCaso('aeo-tronco-caso1', { timeoutMs: 2000 });
  assert.equal(result.ok, true);
});

if (failed) {
  console.error('SESSION-WAIT TESTS FAILED');
  process.exit(1);
}
console.log('SESSION-WAIT TESTS PASSED');
