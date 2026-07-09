/**
 * Snapshot path inspection for REST + MCP template + session_inspect tool.
 */

import { inspectAtPath, parsePath } from '@zeus/presets-sdk';

const SNAPSHOT_TOP_KEYS = new Set([
  'monitor', 'health', 'session', 'catalog', 'infrastructure', 'debug', 'events',
  'schemaVersion', 'updatedAt', 'decks'
]);

/**
 * @param {import('./state-store.mjs').PlayerSnapshot} snap
 * @param {string} [path]
 */
export function inspectSnapshotData(snap, path = 'session') {
  const normalized = path || 'session';
  const segments = parsePath(normalized);
  if (segments.length === 0 || SNAPSHOT_TOP_KEYS.has(segments[0])) {
    return inspectAtPath(snap, normalized);
  }
  return inspectAtPath(snap.session, normalized);
}

/**
 * @param {ReturnType<import('./state-store.mjs').createStateStore>} stateStore
 * @param {string} [path]
 */
export function inspectSnapshotAt(stateStore, path = 'session') {
  return inspectSnapshotData(stateStore.getSnapshot(), path);
}
