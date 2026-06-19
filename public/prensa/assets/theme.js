(function () {
  var KEY = "ne-theme";
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    if (btn) {
      var isLight = theme === "light";
      btn.textContent = isLight ? "Modo oscuro" : "Modo claro";
      btn.setAttribute("aria-checked", isLight ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"
      );
    }
  }

  function toggle() {
    var current = root.getAttribute("data-theme") || "dark";
    apply(current === "light" ? "dark" : "light");
  }

  if (btn) {
    btn.setAttribute("role", "switch");
    btn.addEventListener("click", toggle);
    var saved = "dark";
    try {
      saved = localStorage.getItem(KEY) || "dark";
    } catch (e) {}
    apply(saved);
  }
})();
