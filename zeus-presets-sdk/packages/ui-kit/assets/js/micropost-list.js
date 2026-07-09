/**
 * Micropost list + card widgets (browser).
 * Firehose preview: Jetstream posts as list items with optional CDR badges.
 */
(function (global) {
  'use strict';

  const root = global;
  const Z = root.Zeus = root.Zeus || {};

  const CDR_STATE = {
    green: 'playing',
    yellow: 'warning',
    red: 'degraded'
  };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resolveEl(host) {
    if (typeof host === 'string') return document.querySelector(host);
    return host;
  }

  /**
   * Normalize a list item or raw Jetstream post into a micropost view model.
   * @param {object} item
   * @returns {{ id: string, handle: string, text: string, isReply: boolean, cdr: string|null, uri: string|null, createdAt: string|null, raw: object|null }}
   */
  function normalizePost(item) {
    if (!item || typeof item !== 'object') {
      return {
        id: '',
        handle: '—',
        text: '',
        isReply: false,
        cdr: null,
        uri: null,
        createdAt: null,
        raw: null
      };
    }

    const raw = item.raw || item.post || (item.handle || item.commit ? item : null);
    const record = raw?.commit?.record || raw?.record || item.record || null;

    const handle = item.handle || raw?.handle || '—';
    const text = item.text
      || item.description
      || record?.text
      || '';
    const isReply = item.isReply != null
      ? Boolean(item.isReply)
      : Boolean(record?.reply || item.reply);
    const uri = item.uri || raw?.uri || null;
    const createdAt = item.createdAt
      || record?.createdAt
      || (raw?.time_us ? String(raw.time_us) : null);

    let cdr = item.cdr || item.cdrLevel || item.cdrColor || null;
    if (!cdr && item.cdrSummary) {
      cdr = item.cdrSummary.level || item.cdrSummary.color || item.cdrSummary.traffic || null;
    }
    if (cdr && typeof cdr === 'string') {
      const lower = cdr.toLowerCase();
      if (lower === 'g' || lower === 'ok' || lower === 'good') cdr = 'green';
      else if (lower === 'y' || lower === 'warn' || lower === 'medium') cdr = 'yellow';
      else if (lower === 'r' || lower === 'bad' || lower === 'low') cdr = 'red';
    }
    if (cdr && !['green', 'yellow', 'red'].includes(cdr)) cdr = null;

    const id = item.id
      || uri
      || raw?.commit?.rkey
      || raw?.commit?.cid
      || handle + ':' + text.slice(0, 32);

    return { id: String(id), handle, text, isReply, cdr, uri, createdAt, raw };
  }

  function postIcon(isReply) {
    return isReply
      ? '<span class="mp-icon mp-icon-reply" aria-label="Respuesta" title="Respuesta">💬</span>'
      : '<span class="mp-icon mp-icon-post" aria-label="Post" title="Post">📝</span>';
  }

  function cdrBadgeHtml(cdr, mode) {
    if (!cdr || mode !== 'labeled') return '';
    const state = CDR_STATE[cdr] || 'loading';
    const label = cdr === 'green' ? 'CDR alto' : cdr === 'yellow' ? 'CDR medio' : 'CDR bajo';
    return '<span class="state-badge mp-cdr-badge mp-cdr-' + cdr + '" data-state="' + state + '" title="' + label + '">CDR</span>';
  }

  function truncateText(text, maxLen) {
    const s = String(text || '').trim();
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + '…';
  }

  /**
   * @param {HTMLElement|string} host
   * @param {{ post: object, showRawToggle?: boolean }} options
   */
  function mountCard(host, options) {
    const container = resolveEl(host);
    if (!container) {
      throw new Error('MicropostCard.mount requires a host element');
    }

    options = options || {};
    const showRawToggle = options.showRawToggle !== false;
    const post = normalizePost(options.post || {});
    let rawVisible = false;

    function render() {
      const handleLabel = post.handle.startsWith('@') ? post.handle : '@' + post.handle;
      const metaParts = [];
      if (post.createdAt) metaParts.push('<span class="mp-meta-item">' + escapeHtml(post.createdAt) + '</span>');
      if (post.uri) metaParts.push('<span class="mp-meta-item mp-meta-uri">' + escapeHtml(post.uri) + '</span>');

      container.innerHTML =
        '<article class="micropost-card" data-mp-card>' +
          '<header class="mp-card-header action-row">' +
            postIcon(post.isReply) +
            '<h4 class="mp-card-handle">' + escapeHtml(handleLabel) + '</h4>' +
            cdrBadgeHtml(post.cdr, 'labeled') +
            (showRawToggle && post.raw
              ? '<button type="button" class="btn btn-outline btn-small mp-raw-toggle" data-mp-raw-toggle>JSON</button>'
              : '') +
          '</header>' +
          '<div class="mp-card-body">' +
            (post.text
              ? '<p class="mp-card-text">' + escapeHtml(post.text) + '</p>'
              : '<p class="mp-card-text mp-card-empty">Sin texto</p>') +
          '</div>' +
          (metaParts.length
            ? '<footer class="mp-card-meta action-row">' + metaParts.join('') + '</footer>'
            : '') +
          (showRawToggle && post.raw
            ? '<pre class="mp-card-raw" data-mp-raw' + (rawVisible ? '' : ' hidden') + '>' +
                escapeHtml(JSON.stringify(post.raw, null, 2)) +
              '</pre>'
            : '') +
        '</article>';

      const toggleBtn = container.querySelector('[data-mp-raw-toggle]');
      const rawEl = container.querySelector('[data-mp-raw]');
      if (toggleBtn && rawEl) {
        toggleBtn.addEventListener('click', function () {
          rawVisible = !rawVisible;
          rawEl.hidden = !rawVisible;
          toggleBtn.classList.toggle('active', rawVisible);
          toggleBtn.textContent = rawVisible ? 'Ocultar JSON' : 'JSON';
        });
      }
    }

    render();

    return {
      update(nextPost) {
        Object.assign(post, normalizePost(nextPost || {}));
        render();
      },
      getPost() {
        return { ...post };
      }
    };
  }

  /**
   * @param {HTMLElement|string} host
   * @param {{ items?: object[], mode?: 'candidate'|'labeled', onSelect?: (item: object, index: number) => void, selectedId?: string, emptyMessage?: string }} options
   */
  function mountList(host, options) {
    const container = resolveEl(host);
    if (!container) {
      throw new Error('MicropostList.mount requires a host element');
    }

    options = options || {};
    const mode = options.mode === 'labeled' ? 'labeled' : 'candidate';
    let items = (options.items || []).map(normalizePost);
    let selectedId = options.selectedId != null ? String(options.selectedId) : null;
    const emptyMessage = options.emptyMessage
      || (mode === 'labeled' ? 'Sin posts etiquetados todavía.' : 'Sin candidatos en esta ruta.');

    container.innerHTML =
      '<div class="micropost-list" data-mp-list>' +
        '<div class="mp-list-header action-row">' +
          '<span class="state-badge mp-mode-badge" data-state="' + (mode === 'labeled' ? 'cued' : 'loading') + '">' +
            (mode === 'labeled' ? 'Etiquetados' : 'Candidatos') +
          '</span>' +
          '<span class="mp-list-count" data-mp-count></span>' +
        '</div>' +
        '<div class="mp-list-host list-panel" data-mp-items tabindex="0" role="listbox" aria-label="Microposts"></div>' +
      '</div>';

    const listRoot = container.querySelector('[data-mp-list]');
    const itemsHost = container.querySelector('[data-mp-items]');
    const countEl = container.querySelector('[data-mp-count]');

    function emitSelect(item, index) {
      if (typeof options.onSelect === 'function') {
        options.onSelect(item, index);
      }
    }

    function render() {
      countEl.textContent = items.length ? items.length + ' posts' : '';

      if (!items.length) {
        itemsHost.innerHTML = '<p class="list-empty mp-list-empty">' + escapeHtml(emptyMessage) + '</p>';
        return;
      }

      itemsHost.innerHTML = items.map(function (item, index) {
        const handleLabel = item.handle.startsWith('@') ? item.handle : '@' + item.handle;
        const selected = selectedId != null && String(item.id) === String(selectedId) ? ' selected' : '';
        const preview = truncateText(item.text, 140);
        return '<button type="button" class="list-item mp-list-item' + selected + '" role="option" ' +
          'data-mp-item data-id="' + escapeHtml(item.id) + '" data-index="' + index + '" ' +
          'aria-selected="' + (selected ? 'true' : 'false') + '">' +
          '<span class="mp-item-leading">' + postIcon(item.isReply) + '</span>' +
          '<span class="mp-item-main">' +
            '<span class="mp-item-title">' + escapeHtml(handleLabel) + '</span>' +
            '<span class="mp-item-desc">' + escapeHtml(preview || '—') + '</span>' +
          '</span>' +
          '<span class="mp-item-trailing">' + cdrBadgeHtml(item.cdr, mode) + '</span>' +
        '</button>';
      }).join('');

      itemsHost.querySelectorAll('[data-mp-item]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const index = Number(btn.getAttribute('data-index'));
          const item = items[index];
          if (!item) return;
          selectedId = String(item.id);
          render();
          emitSelect(item, index);
        });
      });
    }

    itemsHost.addEventListener('keydown', function (e) {
      if (!items.length) return;
      const currentIndex = selectedId != null
        ? items.findIndex(function (it) { return String(it.id) === String(selectedId); })
        : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        selectedId = String(items[next].id);
        render();
        emitSelect(items[next], next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        selectedId = String(items[prev].id);
        render();
        emitSelect(items[prev], prev);
      }
    });

    render();

    return {
      setItems(nextItems) {
        items = (nextItems || []).map(normalizePost);
        if (selectedId != null && !items.some(function (it) { return String(it.id) === String(selectedId); })) {
          selectedId = null;
        }
        render();
      },
      getItems() {
        return items.map(function (it) { return { ...it }; });
      },
      setSelectedId(id) {
        selectedId = id != null ? String(id) : null;
        render();
      },
      getSelectedId() {
        return selectedId;
      },
      getMode() {
        return mode;
      },
      refresh: render
    };
  }

  Z.MicropostCard = { mount: mountCard, normalizePost: normalizePost };
  Z.MicropostList = { mount: mountList, normalizePost: normalizePost };
})(typeof window !== 'undefined' ? window : globalThis);
