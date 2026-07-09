/**
 * Shared relative paths and deep links for @zeus/view-ui.
 */

import { buildUiHref } from './discovery-config.mjs';

export const DEFAULT_SATELITE_WP = 'wp/historia';

/**
 * @param {string} [satRel]
 */
export function normalizeSatRel(satRel) {
  return String(satRel || DEFAULT_SATELITE_WP).replace(/\/+$/, '');
}

/**
 * @param {string} satRel
 * @param {number|string} oldid
 */
export function wikitextPath(satRel, oldid) {
  return `${normalizeSatRel(satRel)}/cache/snapshots/${oldid}.wikitext`;
}

/**
 * @typedef {object} ViewLinkItem
 * @property {string} id
 * @property {string} label
 * @property {string} path
 * @property {string} [href]
 * @property {string} [kind] - wikitext | markdown | json | browse
 * @property {boolean} [disabled]
 * @property {string} [title]
 */

/**
 * @param {string} nodoId
 */
export function nodoMetaPath(nodoId) {
  return `nodos/${nodoId}/meta.json`;
}

/**
 * @param {string} satRel
 * @param {string} registroId
 * @param {number|string} oldid
 */
export function registroMdPath(satRel, registroId, oldid) {
  return `${normalizeSatRel(satRel)}/registros/${registroId}-oldid-${oldid}/registro.md`;
}

/**
 * @param {string} satRel
 */
export function registrosBrowsePath(satRel) {
  return `${normalizeSatRel(satRel)}/registros/`;
}

/**
 * @param {{ viewEntry: object, lineaId: string, path?: string }} opts
 */
export function buildViewDeepLink({ viewEntry, lineaId, path }) {
  const base = buildUiHref(viewEntry).replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('linea', lineaId);
  if (path) params.set('path', path);
  return `${base}/?${params.toString()}`;
}

/**
 * @param {object} opts
 * @returns {ViewLinkItem}
 */
export function toViewLinkItem({
  id,
  label,
  path,
  kind,
  disabled,
  title,
  viewEntry,
  lineaId
}) {
  /** @type {ViewLinkItem} */
  const item = {
    id,
    label,
    path,
    kind,
    disabled: Boolean(disabled),
    title
  };
  if (!item.disabled && viewEntry && lineaId && path) {
    item.href = buildViewDeepLink({ viewEntry, lineaId, path });
  }
  return item;
}
