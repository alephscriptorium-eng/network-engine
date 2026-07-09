/**
 * Plain text viewer with optional metadata panel (browser).
 */
(function (global) {
  'use strict';

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {string} options.text
   * @param {string} [options.title]
   * @param {object} [options.meta]
   * @param {string} [options.hint]
   */
  function mount(container, options) {
    if (!container) throw new Error('TextViewer.mount requires container');
    const title = options?.title || '';
    const text = options?.text ?? '';
    const meta = options?.meta;
    const hint = options?.hint || '';

    let metaHtml = '';
    if (meta && typeof meta === 'object') {
      metaHtml =
        '<aside class="tv-meta">' +
          '<h4>Metadatos</h4>' +
          '<pre class="tv-meta-json">' + escapeHtml(JSON.stringify(meta, null, 2)) + '</pre>' +
        '</aside>';
    }

    container.innerHTML =
      '<div class="text-viewer" data-tv-root>' +
        (title ? '<header class="tv-title">' + escapeHtml(title) + '</header>' : '') +
        (hint ? '<p class="tv-hint">' + escapeHtml(hint) + '</p>' : '') +
        metaHtml +
        '<pre class="tv-body">' + escapeHtml(text) + '</pre>' +
      '</div>';

    return {
      refresh: function (opts) {
        mount(container, { ...options, ...opts });
      }
    };
  }

  global.ZeusTextViewer = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
