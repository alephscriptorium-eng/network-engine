/**
 * Client-side viewer launcher for @zeus/view-ui deep links.
 */
(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const Z = root.Zeus = root.Zeus || {};

  function resolveEl(el) {
    if (typeof el === 'string') return document.querySelector(el);
    return el;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  function linkHtml(item) {
    if (!item?.href || item.disabled) {
      return `<span class="viewer-launcher viewer-launcher--disabled" title="${escapeAttr(item?.title || '')}">${escapeHtml(item?.label || '')}</span>`;
    }
    return `<a class="viewer-launcher viewer-launcher-link viewer-launcher-icon" href="${escapeAttr(item.href)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(item.title || item.label || '')}">${escapeHtml(item.label || '↗')}</a>`;
  }

  Z.openViewer = function openViewer({ href }) {
    if (!href) return;
    window.open(href, '_blank', 'noopener');
  };

  Z.ViewerLauncher = {
    mountMenu(el, { label = 'Referencias', items = [] } = {}) {
      const node = resolveEl(el);
      if (!node) return;
      const enabled = (items || []).filter((item) => item.href && !item.disabled);
      if (enabled.length === 0) {
        node.innerHTML = `<span class="viewer-launcher-menu viewer-launcher-menu--empty"><span class="viewer-launcher-menu-label">${escapeHtml(label)}</span></span>`;
        return;
      }
      node.innerHTML = `<details class="viewer-launcher-menu">
        <summary class="viewer-launcher-menu-trigger btn btn-outline btn-sm">${escapeHtml(label)} (${enabled.length})</summary>
        <ul class="viewer-launcher-menu-list">
          ${enabled.map((item) => `<li class="viewer-launcher-menu-item">${linkHtml(item)}</li>`).join('')}
        </ul>
      </details>`;
    },

    renderButton(el, { label = 'Abrir en Cache', item = null, items = [] } = {}) {
      const node = resolveEl(el);
      if (!node) return;
      const pick = item || (items || []).find((entry) => entry.href && !entry.disabled) || null;
      if (!pick?.href) {
        node.innerHTML = '';
        return;
      }
      node.innerHTML = `<a class="btn btn-outline btn-sm viewer-launcher-btn" href="${escapeAttr(pick.href)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(pick.title || pick.label || label)}">${escapeHtml(pick.label || label)} ↗</a>`;
    },

    renderItemRow(el, items = []) {
      const node = resolveEl(el);
      if (!node) return;
      const enabled = (items || []).filter((item) => item.href && !item.disabled);
      node.innerHTML = enabled.map((item) => linkHtml(item)).join('');
    },

    buildHref({ viewBase, lineaId, path }) {
      const base = String(viewBase || '').replace(/\/$/, '');
      const params = new URLSearchParams();
      params.set('linea', lineaId || 'espana');
      if (path) params.set('path', path);
      return `${base}/?${params.toString()}`;
    }
  };
})();
