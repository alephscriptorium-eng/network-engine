/**
 * Build raw.githubusercontent.com URLs for canonical repo docs.
 * Portal links to source files — no corpus duplication in public/.
 */
(function (global) {
  const DEFAULTS = {
    owner: "alephscriptorium-eng",
    repo: "network-engine",
    branch: "main",
  };

  /**
   * @param {string} path - Repo-relative path (e.g. agents/skills/disfraz-rude-bot/SKILL.md)
   * @param {{ owner?: string, repo?: string, branch?: string }} [opts]
   * @returns {string}
   */
  function githubBlob(path, opts = {}) {
    const owner = opts.owner || DEFAULTS.owner;
    const repo = opts.repo || DEFAULTS.repo;
    const branch = opts.branch || DEFAULTS.branch;
    const clean = String(path).replace(/^\/+/, "");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${clean}`;
  }

  /**
   * @param {string} path
   * @param {{ owner?: string, repo?: string, branch?: string }} [opts]
   * @returns {string}
   */
  function githubView(path, opts = {}) {
    const owner = opts.owner || DEFAULTS.owner;
    const repo = opts.repo || DEFAULTS.repo;
    const branch = opts.branch || DEFAULTS.branch;
    const clean = String(path).replace(/^\/+/, "");
    return `https://github.com/${owner}/${repo}/blob/${branch}/${clean}`;
  }

  global.githubBlob = githubBlob;
  global.githubView = githubView;
})(typeof window !== "undefined" ? window : globalThis);
