/**
 * Shared relative paths and deep links for @zeus/firehose-view-ui.
 */

import { buildUiHref } from './discovery-config.mjs';

export const FIREHOSE_VOLUME_ID = 'firehose';
export const TRIAGE_MANIFEST_PATH = 'triage-manifest.json';

/**
 * @param {string} corpusId
 * @param {string} [relativePath]
 */
export function corpusRelPath(corpusId, relativePath = '') {
  const base = String(corpusId || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const rel = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!base) return rel;
  return rel ? `${base}/${rel}` : base;
}

/**
 * @param {{ firehoseEntry: object, corpus?: string, path?: string, mode?: string }} opts
 */
export function buildFirehoseDeepLink({ firehoseEntry, corpus, path, mode }) {
  const base = buildUiHref(firehoseEntry).replace(/\/$/, '');
  const params = new URLSearchParams();
  if (corpus) params.set('corpus', corpus);
  if (path) params.set('path', path);
  if (mode) params.set('mode', mode);
  const qs = params.toString();
  return qs ? `${base}/?${qs}` : `${base}/`;
}

/**
 * @param {object} opts
 */
export function toFirehoseLinkItem({
  id,
  label,
  corpus,
  path,
  mode,
  kind,
  disabled,
  title,
  firehoseEntry
}) {
  const item = {
    id,
    label,
    corpus,
    path,
    mode,
    kind,
    disabled: Boolean(disabled),
    title
  };
  if (!item.disabled && firehoseEntry && corpus) {
    item.href = buildFirehoseDeepLink({ firehoseEntry, corpus, path, mode });
  }
  return item;
}
