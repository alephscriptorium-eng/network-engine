/**
 * Client-side viewer launcher for @zeus/view-ui deep links.
 */
(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const Z = root.Zeus = root.Zeus || {};

  const MENU_SECTION_LABELS = {
    selection: 'Selección',
    home: 'Explorador',
    corpus: 'Corpora',
    batch: 'Batches recientes'
  };

  let menuInteractionsBound = false;

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

  function menuItemMeta(item) {
    const title = item?.title || '';
    if (item?.kind === 'corpus' && /\d+\s*archivos?/i.test(title)) return title;
    if (title && title.length <= 14 && title !== item?.label) return title;
    return '↗';
  }

  function menuItemHtml(item) {
    const meta = menuItemMeta(item);
    if (!item?.href || item.disabled) {
      const kindBadge = item.kind
        ? `<span class="viewer-launcher-menu-link-kind" data-kind="${escapeAttr(item.kind)}">${escapeHtml(item.kind)}</span>`
        : `<span class="viewer-launcher-menu-link-meta">${escapeHtml(meta)}</span>`;
      return `<div class="viewer-launcher-menu-link--disabled" title="${escapeAttr(item.title || item.label || '')}">
        <span class="viewer-launcher-menu-link-label">${escapeHtml(item.label || '')}</span>
        ${kindBadge}
      </div>`;
    }

    return `<a class="viewer-launcher-menu-link" href="${escapeAttr(item.href)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(item.title || item.label || '')}" role="menuitem">
      <span class="viewer-launcher-menu-link-label">${escapeHtml(item.label || '')}</span>
      <span class="viewer-launcher-menu-link-meta">${escapeHtml(meta)}</span>
    </a>`;
  }

  function menuListHtml(items) {
    const parts = [];
    let lastKind = null;

    for (const item of items) {
      const kind = item.kind || null;
      if (kind && kind !== lastKind && MENU_SECTION_LABELS[kind]) {
        parts.push(`<li class="viewer-launcher-menu-section">${escapeHtml(MENU_SECTION_LABELS[kind])}</li>`);
        lastKind = kind;
      } else if (!kind && lastKind !== '__plain') {
        lastKind = '__plain';
      }
      parts.push(`<li class="viewer-launcher-menu-item">${menuItemHtml(item)}</li>`);
    }

    return parts.join('');
  }

  function logMenuMetrics(menu, hypothesisId, message) {
    if (!menu) return;
    const panel = menu.querySelector('.viewer-launcher-menu-panel');
    const list = menu.querySelector('.viewer-launcher-menu-list');
    const header = menu.querySelector('.viewer-launcher-menu-header');
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const listStyle = list ? getComputedStyle(list) : null;
    const widest = list
      ? Math.max(...[...list.querySelectorAll('*')].map((el) => el.scrollWidth))
      : 0;
    // #region agent log
    fetch('http://127.0.0.1:7850/ingest/d471669f-5fd0-40dc-ab5d-5bfc7c0e0097',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'85e8ff'},body:JSON.stringify({sessionId:'85e8ff',hypothesisId,location:'viewer-launcher.js:logMenuMetrics',message,data:{message,hasHeader:!!header,headerText:header?.textContent?.trim()||null,panelClientW:panel?.clientWidth,panelScrollW:panel?.scrollWidth,panelOverflowX:panelStyle?.overflowX,panelOverflowY:panelStyle?.overflowY,listClientW:list?.clientWidth,listScrollW:list?.scrollWidth,listOverflowY:listStyle?.overflowY,listOverflowX:listStyle?.overflowX,widestChild:widest,itemCount:list?.children?.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  function bindMenuInteractions(menu) {
    if (!menu || menu.dataset.menuBound === 'true') return;
    menu.dataset.menuBound = 'true';

    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      // #region agent log
      fetch('http://127.0.0.1:7850/ingest/d471669f-5fd0-40dc-ab5d-5bfc7c0e0097',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'85e8ff'},body:JSON.stringify({sessionId:'85e8ff',hypothesisId:'H1',location:'viewer-launcher.js:toggle',message:'menu opened',data:{open:menu.open},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      logMenuMetrics(menu, 'H2', 'metrics on open');
      document.querySelectorAll('.viewer-launcher-menu[open]').forEach((other) => {
        if (other !== menu) other.removeAttribute('open');
      });
    });
  }

  function ensureMenuInteractions() {
    if (menuInteractionsBound) return;
    menuInteractionsBound = true;

    document.addEventListener('click', (event) => {
      document.querySelectorAll('.viewer-launcher-menu[open]').forEach((menu) => {
        if (!menu.contains(event.target)) menu.removeAttribute('open');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.viewer-launcher-menu[open]').forEach((menu) => {
        menu.removeAttribute('open');
      });
    });
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
        <summary class="viewer-launcher-menu-trigger btn btn-outline btn-sm">
          <span class="viewer-launcher-menu-trigger-label">${escapeHtml(label)}</span>
          <span class="viewer-launcher-menu-trigger-badge">${enabled.length}</span>
          <span class="viewer-launcher-menu-chevron" aria-hidden="true"></span>
        </summary>
        <div class="viewer-launcher-menu-panel" role="menu">
          <ul class="viewer-launcher-menu-list">${menuListHtml(enabled)}</ul>
        </div>
      </details>`;

      ensureMenuInteractions();
      const menu = node.querySelector('.viewer-launcher-menu');
      bindMenuInteractions(menu);
      // #region agent log
      const firstMeta = menu?.querySelector('.viewer-launcher-menu-link-meta')?.textContent?.trim() || null;
      fetch('http://127.0.0.1:7850/ingest/d471669f-5fd0-40dc-ab5d-5bfc7c0e0097',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'85e8ff'},body:JSON.stringify({sessionId:'85e8ff',runId:'post-fix',hypothesisId:'H9',location:'viewer-launcher.js:mountMenu',message:'menu mounted',data:{label,itemCount:enabled.length,hasHeaderInHtml:node.innerHTML.includes('viewer-launcher-menu-header'),hasHintInHtml:node.innerHTML.includes('Abrir en nueva pestaña'),firstMeta},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
