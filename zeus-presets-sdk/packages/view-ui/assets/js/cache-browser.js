/**
 * Cache browser — lazy tree + viewer dispatcher.
 */
(function (global) {
  'use strict';

  const EXPANDED = new Set();

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
      linea: params.get('linea'),
      path: params.get('path')
    };
  }

  function setQuery(linea, filePath) {
    const params = new URLSearchParams();
    if (linea) params.set('linea', linea);
    if (filePath) params.set('path', filePath);
    const qs = params.toString();
    const next = qs ? '?' + qs : window.location.pathname;
    window.history.replaceState({}, '', next);
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function iconForEntry(entry) {
    if (entry.type === 'directory') return '📁';
    if (entry.viewer === 'anchors-explorer') return '⚓';
    if (entry.ext === '.json') return '📋';
    if (entry.ext === '.md') return '📝';
    if (entry.ext === '.wikitext') return '📄';
    return '📎';
  }

  /**
   * @param {object} state
   */
  function mountCacheBrowser(state) {
    const treeHost = document.getElementById('cache-tree-host');
    const viewerHost = document.getElementById('cache-viewer-host');
    const metaHost = document.getElementById('cache-viewer-meta');
    const breadcrumbEl = document.getElementById('cache-breadcrumb');
    const viewerLabelEl = document.getElementById('cache-viewer-label');
    const lineaSelect = document.getElementById('cache-linea-select');
    const coverageBadge = document.getElementById('cache-coverage-badge');
    const btnRefresh = document.getElementById('cache-tree-refresh');
    const btnRoot = document.getElementById('cache-tree-root');
    const btnCopyPath = document.getElementById('cache-copy-path');
    const btnDownload = document.getElementById('cache-download');
    const openPlayer = document.getElementById('cache-open-player');

    if (!treeHost || !viewerHost) return;

    let lineaId = state.lineaId;
    let activePath = state.filePath || '';
    let activeFile = null;
    let explorerHandle = null;
    let anchorsHandle = null;

    function updatePlayerLink() {
      if (!openPlayer || !state.config?.player) return;
      const host = state.config.player.host || 'localhost';
      const port = state.config.player.port || 3013;
      openPlayer.href = 'http://' + host + ':' + port + '/';
    }

    async function loadLineas() {
      const data = await fetchJson('/api/lineas');
      lineaSelect.innerHTML = '';
      for (const linea of data.lineas) {
        const opt = document.createElement('option');
        opt.value = linea.id;
        opt.textContent = linea.etiqueta ? linea.id + ' — ' + linea.etiqueta : linea.id;
        if (linea.id === lineaId) opt.selected = true;
        lineaSelect.appendChild(opt);
      }
      if (!lineaId && data.lineas.length) {
        lineaId = data.lineas[0].id;
      }
    }

    async function refreshCoverage() {
      if (!coverageBadge || !lineaId) return;
      try {
        const stats = await fetchJson('/api/stats?linea=' + encodeURIComponent(lineaId));
        const pct = stats.stats?.coverage_pct;
        const src = stats.source === 'mcp+filesystem' ? 'live' : 'disk';
        if (pct != null) {
          coverageBadge.textContent = 'cobertura ' + pct + '% (' + src + ')';
          coverageBadge.dataset.state = pct >= 50 ? 'success' : pct > 0 ? 'warning' : 'neutral';
        } else {
          coverageBadge.textContent = 'cobertura —';
          coverageBadge.dataset.state = 'neutral';
        }
      } catch {
        coverageBadge.textContent = 'cobertura —';
        coverageBadge.dataset.state = 'neutral';
      }
    }

    function setBreadcrumb(filePath, viewer) {
      const display = filePath ? '/' + filePath : '/';
      breadcrumbEl.textContent = display;
      viewerLabelEl.textContent = viewer ? ' · ' + viewer : '';
    }

    async function loadDirectory(dirPath, container) {
      const data = await fetchJson(
        '/api/browse?linea=' + encodeURIComponent(lineaId) +
        '&path=' + encodeURIComponent(dirPath || '')
      );

      container.innerHTML = '';
      const ul = document.createElement('ul');
      ul.className = 'cache-tree-list';

      for (const entry of data.entries) {
        const li = document.createElement('li');
        li.className = 'cache-tree-item cache-tree-' + entry.type;
        li.dataset.path = entry.path;
        li.dataset.type = entry.type;

        const row = document.createElement('div');
        row.className = 'cache-tree-row';
        row.innerHTML =
          '<span class="cache-tree-icon">' + iconForEntry(entry) + '</span>' +
          '<button type="button" class="cache-tree-label" data-action="open">' +
            escapeHtml(entry.name) +
          '</button>';

        if (entry.type === 'directory') {
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'cache-tree-toggle';
          toggle.textContent = EXPANDED.has(entry.path) ? '▼' : '▶';
          toggle.dataset.action = 'toggle';
          row.insertBefore(toggle, row.firstChild);

          const childHost = document.createElement('div');
          childHost.className = 'cache-tree-children';
          childHost.hidden = !EXPANDED.has(entry.path);
          li.appendChild(row);
          li.appendChild(childHost);

          if (EXPANDED.has(entry.path)) {
            loadDirectory(entry.path, childHost).catch(showTreeError);
          }

          toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            if (EXPANDED.has(entry.path)) {
              EXPANDED.delete(entry.path);
              childHost.hidden = true;
              toggle.textContent = '▶';
            } else {
              EXPANDED.add(entry.path);
              childHost.hidden = false;
              toggle.textContent = '▼';
              if (!childHost.dataset.loaded) {
                loadDirectory(entry.path, childHost)
                  .then(function () { childHost.dataset.loaded = '1'; })
                  .catch(showTreeError);
              }
            }
          });
        } else {
          li.appendChild(row);
        }

        row.querySelector('[data-action="open"]').addEventListener('click', function () {
          if (entry.type === 'directory') {
            EXPANDED.add(entry.path);
            renderTree().catch(showTreeError);
          } else {
            openFile(entry.path).catch(showViewerError);
          }
        });

        ul.appendChild(li);
      }

      if (data.pagination?.hasMore) {
        const more = document.createElement('p');
        more.className = 'cache-tree-more';
        more.textContent = '+' + (data.pagination.total - data.pagination.offset - data.pagination.limit) + ' más…';
        container.appendChild(ul);
        container.appendChild(more);
      } else {
        container.appendChild(ul);
      }
    }

    function showTreeError(err) {
      treeHost.innerHTML = '<p class="cache-error">Árbol: ' + escapeHtml(err.message) + '</p>';
    }

    function showViewerError(err) {
      viewerHost.innerHTML = '<p class="cache-error">Visor: ' + escapeHtml(err.message) + '</p>';
      metaHost.hidden = true;
    }

    async function renderTree() {
      treeHost.innerHTML = '<p class="cache-loading">Cargando árbol…</p>';
      await loadDirectory('', treeHost);
    }

    function clearViewer() {
      explorerHandle = null;
      anchorsHandle = null;
      viewerHost.innerHTML = '<p class="cache-viewer-placeholder">Selecciona un archivo en el árbol.</p>';
      metaHost.hidden = true;
      metaHost.innerHTML = '';
      activeFile = null;
      activePath = '';
      setBreadcrumb('', '');
      setQuery(lineaId, '');
    }

    function mountObjectExplorer(file) {
      viewerHost.innerHTML = '<div id="cache-oe-host"></div>';
      const host = document.getElementById('cache-oe-host');
      const data = file.data;
      explorerHandle = global.ZeusObjectExplorer.mount(host, {
        getData: function () { return data; },
        path: '',
        rootLabel: file.name.replace(/\.json$/i, ''),
        onPathChange: function () {}
      });
    }

    function mountMarkdown(file) {
      global.ZeusMarkdownPreview.mount(viewerHost, {
        title: file.name,
        markdown: typeof file.data === 'string' ? file.data : String(file.data)
      });
    }

    function mountText(file, hint) {
      global.ZeusTextViewer.mount(viewerHost, {
        title: file.name,
        text: typeof file.data === 'string' ? file.data : JSON.stringify(file.data, null, 2),
        meta: file.meta,
        hint: hint || ''
      });
    }

    function mountAnchorsFromFile(file) {
      viewerHost.innerHTML = '<div id="cache-ae-host"></div>';
      const host = document.getElementById('cache-ae-host');
      const gridPromise = Promise.resolve({
        linea: { id: lineaId },
        cells: (Array.isArray(file.data) ? file.data : [])
          .filter(function (e) { return e.tier === 'nodo-anchor' && e.nodo_id; })
          .map(function (anchor) {
            return {
              nodo_id: anchor.nodo_id,
              oldid: Number(anchor.oldid),
              note: anchor.note,
              status: 'missing'
            };
          }),
        summary: { total: 0, cached: 0, stub: 0, missing: 0 }
      }).then(function (seed) {
        return fetchJson('/api/anchors?linea=' + encodeURIComponent(lineaId))
          .catch(function () { return seed; });
      });

      anchorsHandle = global.ZeusAnchorsExplorer.mount(host, {
        title: 'Wave A — ' + file.name,
        initialLineaId: lineaId,
        fetchLineas: function () {
          return fetchJson('/api/lineas').then(function (d) {
            return { lineas: d.lineas.map(function (l) {
              return { id: l.id, etiqueta: l.etiqueta };
            }) };
          });
        },
        fetchGrid: function (lid) {
          if (lid !== lineaId) {
            lineaId = lid;
            lineaSelect.value = lid;
            refreshCoverage();
            renderTree();
          }
          return fetchJson('/api/anchors?linea=' + encodeURIComponent(lid));
        },
        onAnchorNavigate: function (payload) {
          if (payload.wikitextPath) {
            openFile(payload.wikitextPath).catch(showViewerError);
          } else if (payload.oldid) {
            fetchJson(
              '/api/view/wikitext-path?linea=' + encodeURIComponent(lineaId) +
              '&oldid=' + encodeURIComponent(payload.oldid)
            ).then(function (r) {
              return openFile(r.path);
            }).catch(showViewerError);
          }
        }
      });

      gridPromise.catch(function () {});
    }

    function renderMetaLinks(file) {
      if (!file.meta?.oldid) {
        metaHost.hidden = true;
        return;
      }
      metaHost.hidden = false;
      const satPath = file.meta.wikitextPath ||
        (function () {
          return null;
        })();
      metaHost.innerHTML =
        '<div class="cache-meta-links">' +
          '<span>oldid: <strong>' + escapeHtml(String(file.meta.oldid)) + '</strong></span>' +
          (satPath
            ? ' · <button type="button" class="btn btn-link" data-jump-wt>' + escapeHtml(satPath) + '</button>'
            : ' · <button type="button" class="btn btn-link" data-jump-wt>Abrir wikitext</button>') +
        '</div>';

      metaHost.querySelector('[data-jump-wt]').addEventListener('click', function () {
        const target = satPath || null;
        if (target) {
          openFile(target).catch(showViewerError);
          return;
        }
        fetchJson(
          '/api/view/wikitext-path?linea=' + encodeURIComponent(lineaId) +
          '&oldid=' + encodeURIComponent(file.meta.oldid)
        ).then(function (r) { return openFile(r.path); })
          .catch(showViewerError);
      });
    }

    async function openFile(filePath) {
      const file = await fetchJson(
        '/api/file?linea=' + encodeURIComponent(lineaId) +
        '&path=' + encodeURIComponent(filePath)
      );
      activeFile = file;
      activePath = filePath;
      setBreadcrumb(filePath, file.viewer);
      setQuery(lineaId, filePath);

      viewerHost.innerHTML = '';
      metaHost.innerHTML = '';
      metaHost.hidden = true;

      switch (file.viewer) {
        case 'object-explorer':
          mountObjectExplorer(file);
          break;
        case 'markdown-preview':
          mountMarkdown(file);
          renderMetaLinks(file);
          break;
        case 'anchors-explorer':
          mountAnchorsFromFile(file);
          break;
        case 'text-plain':
        default:
          mountText(file, file.kind === 'wikitext' ? 'Wikitext sin render HTML (v1)' : '');
          renderMetaLinks(file);
          break;
      }
    }

    async function switchLinea(newId) {
      lineaId = newId;
      EXPANDED.clear();
      clearViewer();
      setQuery(lineaId, '');
      await refreshCoverage();
      await renderTree();
    }

    lineaSelect.addEventListener('change', function () {
      switchLinea(lineaSelect.value).catch(showTreeError);
    });

    btnRefresh.addEventListener('click', function () {
      renderTree().catch(showTreeError);
      refreshCoverage();
    });

    btnRoot.addEventListener('click', function () {
      EXPANDED.clear();
      renderTree().catch(showTreeError);
    });

    btnCopyPath.addEventListener('click', function () {
      if (!activePath) return;
      navigator.clipboard.writeText(activePath).catch(function () {});
    });

    btnDownload.addEventListener('click', function () {
      if (!activeFile) return;
      const blob = new Blob(
        [typeof activeFile.data === 'string' ? activeFile.data : JSON.stringify(activeFile.data, null, 2)],
        { type: 'application/octet-stream' }
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = activeFile.name || 'download';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    updatePlayerLink();

    loadLineas()
      .then(function () {
        return refreshCoverage();
      })
      .then(function () {
        return renderTree();
      })
      .then(function () {
        const q = parseQuery();
        if (q.linea) {
          lineaId = q.linea;
          lineaSelect.value = lineaId;
        }
        if (q.path) {
          const parts = q.path.split('/');
          let acc = '';
          for (const part of parts.slice(0, -1)) {
            acc = acc ? acc + '/' + part : part;
            EXPANDED.add(acc);
          }
          return renderTree().then(function () {
            return openFile(q.path);
          });
        }
      })
      .catch(function (err) {
        showTreeError(err);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetchJson('/api/config')
      .then(function (config) {
        const q = parseQuery();
        mountCacheBrowser({
          lineaId: q.linea || config.defaultLinea || 'espana',
          filePath: q.path || '',
          config: config
        });
      })
      .catch(function (err) {
        const host = document.getElementById('cache-tree-host');
        if (host) host.innerHTML = '<p class="cache-error">' + escapeHtml(err.message) + '</p>';
      });
  });
})(typeof window !== 'undefined' ? window : globalThis);
