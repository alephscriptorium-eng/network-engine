/**
 * Lightweight markdown preview (browser).
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

  function inlineFormat(text) {
    let out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return out;
  }

  function renderMarkdown(source) {
    const lines = String(source || '').split('\n');
    const html = [];
    let inCode = false;
    let codeBuf = [];
    let listType = null;

    function flushList() {
      if (listType) {
        html.push('</' + listType + '>');
        listType = null;
      }
    }

    for (const line of lines) {
      if (line.startsWith('```')) {
        flushList();
        if (!inCode) {
          inCode = true;
          codeBuf = [];
        } else {
          html.push('<pre class="md-code"><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
          inCode = false;
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushList();
        const level = heading[1].length;
        html.push('<h' + level + '>' + inlineFormat(heading[2]) + '</h' + level + '>');
        continue;
      }

      const ul = line.match(/^\s*[-*]\s+(.+)$/);
      if (ul) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
          html.push('<ul>');
        }
        html.push('<li>' + inlineFormat(ul[1]) + '</li>');
        continue;
      }

      const ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ol) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
          html.push('<ol>');
        }
        html.push('<li>' + inlineFormat(ol[1]) + '</li>');
        continue;
      }

      flushList();
      if (line.trim() === '') {
        html.push('<br>');
      } else {
        html.push('<p>' + inlineFormat(line) + '</p>');
      }
    }

    flushList();
    if (inCode && codeBuf.length) {
      html.push('<pre class="md-code"><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
    }

    return html.join('\n');
  }

  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {string} options.markdown
   * @param {string} [options.title]
   */
  function mount(container, options) {
    if (!container) throw new Error('MarkdownPreview.mount requires container');
    const title = options?.title || '';
    const body = renderMarkdown(options?.markdown || '');
    container.innerHTML =
      '<div class="markdown-preview" data-md-root>' +
        (title ? '<header class="md-title">' + escapeHtml(title) + '</header>' : '') +
        '<article class="md-body">' + body + '</article>' +
      '</div>';
    return {
      refresh: function (md) {
        mount(container, { title: title, markdown: md });
      }
    };
  }

  global.ZeusMarkdownPreview = { mount: mount, render: renderMarkdown };
})(typeof window !== 'undefined' ? window : globalThis);
