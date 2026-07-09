import assert from 'node:assert/strict';
import {
  parsePath,
  formatPath,
  getAtPath,
  getParentPath,
  listChildren,
  getSiblingPaths,
  inspectAtPath,
  buildFocusExport
} from '../src/json-path.mjs';

const SESSION_FIXTURE = {
  phase: 'activa',
  playhead: { year: 1300, playing: false },
  sync: true,
  activeCaso: 'aeo-p24-linea',
  decks: {
    A: { phase: 'cued', serverName: 'linea-espana', resolved: { nodo: { id: 'P05' } } },
    B: {
      phase: 'playing',
      resolved: {
        registros: {
          total: 2,
          items: [
            { registro_id: 'R1', oldid: 100 },
            { registro_id: 'R2', oldid: 200 }
          ]
        }
      }
    }
  }
};

assert.deepEqual(parsePath('session'), []);
assert.deepEqual(parsePath('decks.B.resolved'), ['decks', 'B', 'resolved']);
assert.equal(formatPath(['decks', 'B']), 'decks.B');
assert.equal(formatPath([]), 'session');

assert.equal(getAtPath(SESSION_FIXTURE, 'phase'), 'activa');
assert.equal(getAtPath(SESSION_FIXTURE, 'decks.B.resolved.registros.items.1.oldid'), 200);
assert.equal(getAtPath(SESSION_FIXTURE, 'decks.X'), undefined);

assert.equal(getParentPath('decks.B.resolved'), 'decks.B');
assert.equal(getParentPath('session'), 'session');

const regItems = getAtPath(SESSION_FIXTURE, 'decks.B.resolved.registros.items');
const children = listChildren(regItems, 'decks.B.resolved.registros.items');
assert.equal(children.length, 2);
assert.equal(children[0].key, '0');
assert.equal(children[0].childPath, 'decks.B.resolved.registros.items.0');

const sib = getSiblingPaths('decks.B.resolved.registros.items.1', SESSION_FIXTURE);
assert.equal(sib.prev, 'decks.B.resolved.registros.items.0');
assert.equal(sib.next, null);

const inspected = inspectAtPath(SESSION_FIXTURE, 'decks.B');
assert.equal(inspected.path, 'decks.B');
assert.ok(Array.isArray(inspected.children));
assert.ok(inspected.children.some(c => c.key === 'resolved'));

const exported = buildFocusExport(SESSION_FIXTURE, 'decks.B.resolved.registros.items.1');
assert.equal(exported.schemaVersion, '1.0');
assert.equal(exported.focus.path, 'decks.B.resolved.registros.items.1');
assert.equal(exported.focus.value.oldid, 200);
assert.equal(exported.focus.navigation.prev, 'decks.B.resolved.registros.items.0');
assert.equal(exported.focus.navigation.next, null);
assert.ok(exported.focus.breadcrumb.includes('items'));

console.log('json-path.mjs: all tests passed');
