/**
 * Context recipes that map domain state to view-ui deep links.
 */

import {
  DEFAULT_SATELITE_WP,
  normalizeSatRel,
  wikitextPath,
  nodoMetaPath,
  registroMdPath,
  registrosBrowsePath,
  toViewLinkItem
} from './view-paths.mjs';

/**
 * @param {object} [resolved]
 */
export function extractNodoId(resolved) {
  const nodo = resolved?.nodo?.nodo ?? resolved?.nodo;
  return nodo?.id || null;
}

/**
 * @param {object} opts
 * @param {string} opts.lineaId
 * @param {string} opts.satRel
 * @param {object} opts.viewEntry
 * @param {string} opts.deckId
 * @param {object} [opts.resolved]
 */
export function buildViewLinkItems({
  lineaId = 'espana',
  satRel = DEFAULT_SATELITE_WP,
  viewEntry,
  deckId,
  resolved
}) {
  const sat = normalizeSatRel(satRel);
  const items = [];
  const nodoId = extractNodoId(resolved);

  if (deckId === 'A' && nodoId) {
    items.push(toViewLinkItem({
      id: `nodo-meta-${nodoId}`,
      label: `Meta ${nodoId}`,
      path: nodoMetaPath(nodoId),
      kind: 'json',
      viewEntry,
      lineaId
    }));
    return items;
  }

  if (deckId !== 'B' || !resolved) return items;

  const reg = resolved.registros;
  const activeOldid =
    resolved.selected?.oldid ??
    resolved.wikitext?.oldid ??
    reg?.anchor?.oldid ??
    null;

  const wt = resolved.wikitext;
  if (wt?.cached && (wt.oldid != null || activeOldid != null)) {
    const oid = wt.oldid ?? activeOldid;
    items.push(toViewLinkItem({
      id: `wikitext-active-${oid}`,
      label: 'Abrir wikitext completo',
      path: wikitextPath(sat, oid),
      kind: 'wikitext',
      viewEntry,
      lineaId
    }));
  }

  if (reg?.anchor?.oldid != null) {
    const anchorItem = reg.items?.find((r) => r.oldid === reg.anchor.oldid);
    const anchorCached = anchorItem?.cached ?? reg.anchor.cached;
    if (anchorCached) {
      items.push(toViewLinkItem({
        id: `anchor-wikitext-${reg.anchor.oldid}`,
        label: `Ancla wikitext ${reg.anchor.oldid}`,
        path: wikitextPath(sat, reg.anchor.oldid),
        kind: 'wikitext',
        viewEntry,
        lineaId
      }));
    }
  }

  if (nodoId) {
    items.push(toViewLinkItem({
      id: `nodo-meta-${nodoId}`,
      label: `Meta ${nodoId}`,
      path: nodoMetaPath(nodoId),
      kind: 'json',
      viewEntry,
      lineaId
    }));
  }

  if (reg?.items?.length) {
    items.push(toViewLinkItem({
      id: 'registros-browse',
      label: 'Carpeta registros',
      path: registrosBrowsePath(sat),
      kind: 'browse',
      viewEntry,
      lineaId
    }));
  }

  for (const item of reg?.items || []) {
    if (item.cached) {
      items.push(toViewLinkItem({
        id: `wikitext-${item.oldid}`,
        label: `${item.registro_id || 'reg'} · wikitext ${item.oldid}`,
        path: wikitextPath(sat, item.oldid),
        kind: 'wikitext',
        title: item.section || '',
        viewEntry,
        lineaId
      }));
    }
    if (item.curated && item.registro_id) {
      items.push(toViewLinkItem({
        id: `registro-md-${item.registro_id}`,
        label: `${item.registro_id} · registro.md`,
        path: registroMdPath(sat, item.registro_id, item.oldid),
        kind: 'markdown',
        title: item.section || '',
        viewEntry,
        lineaId
      }));
    }
  }

  return items;
}

/**
 * @param {object} opts
 */
export function buildRegistroViewLinks({ satRel, viewEntry, lineaId, item }) {
  const sat = normalizeSatRel(satRel);
  const links = [];
  if (item.cached) {
    links.push(toViewLinkItem({
      id: `wikitext-${item.oldid}`,
      label: '↗',
      path: wikitextPath(sat, item.oldid),
      kind: 'wikitext',
      title: `Wikitext ${item.oldid}`,
      viewEntry,
      lineaId
    }));
  }
  if (item.curated && item.registro_id) {
    links.push(toViewLinkItem({
      id: `registro-md-${item.registro_id}`,
      label: '↗',
      path: registroMdPath(sat, item.registro_id, item.oldid),
      kind: 'markdown',
      title: `registro.md ${item.registro_id}`,
      viewEntry,
      lineaId
    }));
  }
  return links;
}

/**
 * Full API payload for player /api/aleph/view-links.
 * @param {object} opts
 */
export function buildViewLinksResponse({
  lineaId = 'espana',
  satRel = DEFAULT_SATELITE_WP,
  viewEntry,
  deckId,
  resolved
}) {
  const items = buildViewLinkItems({ lineaId, satRel, viewEntry, deckId, resolved });
  const wikitext = items.find((i) => i.id?.startsWith('wikitext-active-')) || null;

  /** @type {Record<string, import('./view-paths.mjs').ViewLinkItem[]>} */
  const byOldid = {};
  for (const item of resolved?.registros?.items || []) {
    byOldid[String(item.oldid)] = buildRegistroViewLinks({
      satRel,
      viewEntry,
      lineaId,
      item
    });
  }

  return { linea: lineaId, items, wikitext, byOldid };
}
