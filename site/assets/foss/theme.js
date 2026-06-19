(function () {
  var KEY = "ml-theme";
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    if (btn) {
      btn.textContent = theme === "light" ? "Modo oscuro" : "Modo claro";
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
  }

  function toggle() {
    var current = root.getAttribute("data-theme") || "dark";
    apply(current === "light" ? "dark" : "light");
  }

  if (btn) {
    btn.addEventListener("click", toggle);
    var saved = "dark";
    try {
      saved = localStorage.getItem(KEY) || "dark";
    } catch (e) {}
    apply(saved);
  }
})();
