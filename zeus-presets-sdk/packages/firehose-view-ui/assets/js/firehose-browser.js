/**
 * Firehose browser — lazy tree + raw/preview dual viewer.
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
      corpus: params.get('corpus'),
      path: params.get('path'),
      mode: params.get('mode')
    };
  }

  function setQuery(corpus, filePath, mode) {
    const params = new URLSearchParams();
    if (corpus) params.set('corpus', corpus);
    if (filePath) params.set('path', filePath);
    if (mode) params.set('mode', mode);
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
    if (entry.ext === '.json') return '📋';
    return '📎';
  }

  function mountFirehoseBrowser(state) {
    const treeHost = document.getElementById('firehose-tree-host');
    const viewerHost = document.getElementById('firehose-viewer-host');
    const previewHost = document.getElementById('firehose-preview-host');
    const listHost = document.getElementById('firehose-micropost-list-host');
    const cardHost = document.getElementById('firehose-micropost-card-host');
    const emptyState = document.getElementById('firehose-empty-state');
    const breadcrumbEl = document.getElementById('firehose-breadcrumb');
    const modeLabelEl = document.getElementById('firehose-mode-label');
    const statsBadge = document.getElementById('firehose-stats-badge');
    const corpusNav = document.getElementById('firehose-corpus-nav');
    const btnRefresh = document.getElementById('firehose-tree-refresh');
    const btnRoot = document.getElementById('firehose-tree-root');
    const btnTriage = document.getElementById('firehose-triage-btn');
    const btnCopyPath = document.getElementById('firehose-copy-path');
    const modeRaw = document.getElementById('firehose-mode-raw');
    const modePreview = document.getElementById('firehose-mode-preview');

    if (!treeHost || !viewerHost) return;

    let corpusId = state.corpusId || 'candidate';
    let activePath = state.filePath || '';
    let viewMode = state.mode === 'preview' ? 'preview' : 'raw';
    let listHandle = null;
    let cardHandle = null;
    let explorerHandle = null;
    let corpusEmpty = false;

    function getModeRadio() {
      return viewMode === 'preview' ? modePreview : modeRaw;
    }

    function syncModeRadios() {
      if (modeRaw) modeRaw.checked = viewMode === 'raw';
      if (modePreview) modePreview.checked = viewMode === 'preview';
    }

    function setBreadcrumb(filePath) {
      const display = filePath ? '/' + filePath : '/';
      breadcrumbEl.textContent = display;
      modeLabelEl.textContent = viewMode === 'preview' ? ' · preview' : ' · raw';
    }

    function showError(host, message) {
      host.innerHTML = '<p class="zeus-dual-viewer-error">' + escapeHtml(message) + '</p>';
    }

    async function refreshStats() {
      if (!statsBadge) return;
      try {
        const stats = await fetchJson('/api/stats');
        const t = stats.totals || {};
        statsBadge.textContent =
          'C:' + (t.candidate || 0) +
          ' R:' + (t.raw || 0) +
          ' D:' + (t.discarded || 0) +
          ' L:' + (t.labeled || 0);
        statsBadge.dataset.state = 'success';
        const corpus = stats.corpora?.find(function (c) { return c.id === corpusId; });
        corpusEmpty = Boolean(corpus?.empty);
      } catch {
        statsBadge.textContent = 'stats —';
        statsBadge.dataset.state = 'neutral';
      }
    }

    function updateEmptyState() {
      if (!emptyState) return;
      const show = corpusId === 'labeled' && corpusEmpty && !activePath;
      emptyState.hidden = !show;
      if (show) {
        viewerHost.hidden = true;
        previewHost.hidden = true;
      }
    }

    function clearViewer() {
      viewerHost.innerHTML = '<p class="zeus-dual-viewer-placeholder">Selecciona un archivo o activa Preview en un directorio.</p>';
      viewerHost.hidden = false;
      if (previewHost) previewHost.hidden = true;
      if (explorerHandle && explorerHandle.destroy) {
        explorerHandle.destroy();
        explorerHandle = null;
      }
    }

    async function renderPreview(dirPath) {
      if (corpusEmpty && corpusId === 'labeled') {
        updateEmptyState();
        return;
      }

      viewerHost.hidden = true;
      previewHost.hidden = false;
      emptyState.hidden = true;

      const data = await fetchJson(
        '/api/posts?corpus=' + encodeURIComponent(corpusId) +
        '&path=' + encodeURIComponent(dirPath || '') +
        '&limit=80'
      );

      const mode = corpusId === 'labeled' ? 'labeled' : 'candidate';
      const emptyMsg = corpusId === 'labeled'
        ? 'Sin posts etiquetados todavía.'
        : 'Sin candidatos en esta ruta.';

      if (!listHandle && global.Zeus?.MicropostList) {
        listHandle = global.Zeus.MicropostList.mount(listHost, {
          mode: mode,
          emptyMessage: emptyMsg,
          onSelect: function (item) {
            if (global.Zeus?.MicropostCard) {
              if (!cardHandle) {
                cardHandle = global.Zeus.MicropostCard.mount(cardHost, { post: item });
              } else {
                cardHandle.update(item);
              }
            }
          }
        });
      } else if (listHandle) {
        listHandle.getMode && listHandle.getMode();
      }

      if (listHandle) {
        listHandle.setItems(data.posts || []);
      }

      if ((data.posts || []).length && global.Zeus?.MicropostCard) {
        if (!cardHandle) {
          cardHandle = global.Zeus.MicropostCard.mount(cardHost, { post: data.posts[0] });
        } else {
          cardHandle.update(data.posts[0]);
        }
        if (listHandle) listHandle.setSelectedId(data.posts[0].id);
      } else if (cardHost) {
        cardHost.innerHTML = '<p class="zeus-dual-viewer-placeholder">' + escapeHtml(emptyMsg) + '</p>';
      }
    }

    async function openFile(filePath) {
      activePath = filePath;
      setBreadcrumb(filePath);
      setQuery(corpusId, filePath, viewMode);
      updateEmptyState();

      if (viewMode === 'preview' && filePath.endsWith('.json')) {
        const file = await fetchJson(
          '/api/file?corpus=' + encodeURIComponent(corpusId) +
          '&path=' + encodeURIComponent(filePath)
        );
        previewHost.hidden = false;
        viewerHost.hidden = true;
        emptyState.hidden = true;
        const post = {
          handle: file.data?.handle,
          text: file.data?.commit?.record?.text,
          uri: file.data?.uri,
          raw: file.data,
          isReply: Boolean(file.data?.commit?.record?.reply)
        };
        if (global.Zeus?.MicropostCard) {
          if (!cardHandle) {
            cardHandle = global.Zeus.MicropostCard.mount(cardHost, { post: post });
          } else {
            cardHandle.update(post);
          }
        }
        if (listHost) listHost.innerHTML = '';
        return;
      }

      const file = await fetchJson(
        '/api/file?corpus=' + encodeURIComponent(corpusId) +
        '&path=' + encodeURIComponent(filePath)
      );

      previewHost.hidden = true;
      viewerHost.hidden = false;
      emptyState.hidden = true;
      viewerHost.innerHTML = '';

      if (file.kind === 'json' && global.Zeus?.ObjectExplorer) {
        explorerHandle = global.Zeus.ObjectExplorer.mount(viewerHost, {
          data: file.data,
          title: file.name
        });
      } else {
        viewerHost.innerHTML = '<pre class="firehose-raw-text">' + escapeHtml(String(file.content || file.data || '')) + '</pre>';
      }
    }

    async function showCurrentView() {
      if (corpusEmpty && corpusId === 'labeled' && !activePath) {
        updateEmptyState();
        return;
      }
      emptyState.hidden = true;
      if (viewMode === 'preview') {
        await renderPreview(activePath);
      } else if (activePath && activePath.endsWith('.json')) {
        await openFile(activePath);
      } else {
        clearViewer();
        setBreadcrumb(activePath);
      }
    }

    async function loadDirectory(dirPath, container) {
      const data = await fetchJson(
        '/api/browse?corpus=' + encodeURIComponent(corpusId) +
        '&path=' + encodeURIComponent(dirPath || '')
      );

      container.innerHTML = '';
      const ul = document.createElement('ul');
      ul.className = 'firehose-tree-list';

      for (const entry of data.entries) {
        const li = document.createElement('li');
        li.className = 'firehose-tree-item firehose-tree-' + entry.type;
        li.dataset.path = entry.path;
        li.dataset.type = entry.type;

        const row = document.createElement('div');
        row.className = 'firehose-tree-row';
        row.innerHTML =
          '<span class="firehose-tree-icon">' + iconForEntry(entry) + '</span>' +
          '<button type="button" class="firehose-tree-label" data-action="open">' +
            escapeHtml(entry.name) +
          '</button>';

        if (entry.type === 'directory') {
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'firehose-tree-toggle';
          toggle.textContent = EXPANDED.has(entry.path) ? '▼' : '▶';
          toggle.dataset.action = 'toggle';
          row.insertBefore(toggle, row.firstChild);

          const childHost = document.createElement('div');
          childHost.className = 'firehose-tree-children';
          childHost.hidden = !EXPANDED.has(entry.path);
          li.appendChild(row);
          li.appendChild(childHost);

          if (EXPANDED.has(entry.path)) {
            loadDirectory(entry.path, childHost).catch(function (e) { showError(treeHost, e.message); });
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
                  .catch(function (err) { showError(treeHost, err.message); });
              }
            }
          });
        } else {
          li.appendChild(row);
        }

        row.querySelector('[data-action="open"]').addEventListener('click', function () {
          if (entry.type === 'directory') {
            activePath = entry.path;
            EXPANDED.add(entry.path);
            setBreadcrumb(activePath);
            setQuery(corpusId, activePath, viewMode);
            renderTree().then(showCurrentView).catch(function (e) { showError(viewerHost, e.message); });
          } else {
            openFile(entry.path).catch(function (e) { showError(viewerHost, e.message); });
          }
        });

        ul.appendChild(li);
      }

      if (data.pagination?.hasMore) {
        const more = document.createElement('p');
        more.className = 'firehose-tree-more';
        more.textContent = '+' + (data.pagination.total - data.pagination.offset - data.pagination.limit) + ' más…';
        ul.appendChild(more);
      }

      container.appendChild(ul);
    }

    async function renderTree() {
      treeHost.innerHTML = '<p class="zeus-dual-viewer-loading">Cargando árbol…</p>';
      treeHost.innerHTML = '';
      await loadDirectory('', treeHost);
    }

    function setCorpusTab(id) {
      corpusId = id;
      activePath = '';
      EXPANDED.clear();
      if (corpusNav) {
        corpusNav.querySelectorAll('.firehose-corpus-tab').forEach(function (btn) {
          btn.setAttribute('aria-selected', btn.getAttribute('data-corpus') === id ? 'true' : 'false');
          btn.classList.toggle('active', btn.getAttribute('data-corpus') === id);
        });
      }
      setQuery(corpusId, '', viewMode);
      refreshStats().then(function () {
        renderTree().then(showCurrentView).catch(function (e) { showError(treeHost, e.message); });
      });
    }

    if (corpusNav) {
      corpusNav.querySelectorAll('.firehose-corpus-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setCorpusTab(btn.getAttribute('data-corpus'));
        });
        if (btn.getAttribute('data-corpus') === corpusId) btn.classList.add('active');
      });
    }

    if (modeRaw) {
      modeRaw.addEventListener('change', function () {
        if (modeRaw.checked) {
          viewMode = 'raw';
          syncModeRadios();
          setQuery(corpusId, activePath, viewMode);
          showCurrentView().catch(function (e) { showError(viewerHost, e.message); });
        }
      });
    }
    if (modePreview) {
      modePreview.addEventListener('change', function () {
        if (modePreview.checked) {
          viewMode = 'preview';
          syncModeRadios();
          setQuery(corpusId, activePath, viewMode);
          showCurrentView().catch(function (e) { showError(viewerHost, e.message); });
        }
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', function () {
        renderTree().catch(function (e) { showError(treeHost, e.message); });
      });
    }
    if (btnRoot) {
      btnRoot.addEventListener('click', function () {
        activePath = '';
        EXPANDED.clear();
        setBreadcrumb('');
        setQuery(corpusId, '', viewMode);
        renderTree().then(showCurrentView).catch(function (e) { showError(treeHost, e.message); });
      });
    }
    if (btnTriage) {
      btnTriage.addEventListener('click', function () {
        viewMode = 'raw';
        syncModeRadios();
        fetchJson('/api/triage').then(function (data) {
          previewHost.hidden = true;
          viewerHost.hidden = false;
          emptyState.hidden = true;
          viewerHost.innerHTML = '';
          activePath = 'triage-manifest.json';
          setBreadcrumb('triage-manifest.json (volume root)');
          if (global.Zeus?.ObjectExplorer) {
            explorerHandle = global.Zeus.ObjectExplorer.mount(viewerHost, {
              data: data.manifest,
              title: 'triage-manifest.json'
            });
          } else {
            viewerHost.innerHTML = '<pre class="firehose-raw-text">' +
              escapeHtml(JSON.stringify(data.manifest, null, 2)) + '</pre>';
          }
        }).catch(function (e) { showError(viewerHost, e.message); });
      });
    }
    if (btnCopyPath) {
      btnCopyPath.addEventListener('click', function () {
        const text = corpusId + ':' + (activePath || '/');
        navigator.clipboard.writeText(text).catch(function () {});
      });
    }

    syncModeRadios();
    setBreadcrumb(activePath);
    refreshStats()
      .then(function () { return renderTree(); })
      .then(showCurrentView)
      .catch(function (e) { showError(treeHost, e.message); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const q = parseQuery();
    mountFirehoseBrowser({
      corpusId: q.corpus || 'candidate',
      filePath: q.path || '',
      mode: q.mode || 'raw'
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
