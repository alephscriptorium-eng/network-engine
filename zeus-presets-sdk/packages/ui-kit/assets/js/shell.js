/**
 * Zeus shell — header theme selector (all UIs).
 */
(function (global) {
  'use strict';

  async function fetchThemes() {
    const res = await fetch('/api/themes');
    if (!res.ok) throw new Error('Failed to load themes');
    return res.json();
  }

  async function populateThemeSelect(select) {
    try {
      const data = await fetchThemes();
      const themes = data.themes || [];
      const current = data.current || select.value;
      if (!themes.length) return;
      select.innerHTML = '';
      for (const themeName of themes) {
        const opt = document.createElement('option');
        opt.value = themeName;
        opt.textContent = themeName;
        if (themeName === current) opt.selected = true;
        select.appendChild(opt);
      }
    } catch (err) {
      console.warn('[ZeusShell] Could not load themes:', err.message);
    }
  }

  function bindThemeSelect(select) {
    select.addEventListener('change', async function (e) {
      const themeName = e.target.value;
      if (global.Zeus && typeof global.Zeus.switchTheme === 'function') {
        await global.Zeus.switchTheme(themeName);
      }
    });
  }

  function init() {
    const select = document.getElementById('zeus-theme-select');
    if (!select) return;
    bindThemeSelect(select);
    populateThemeSelect(select);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.ZeusShell = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
