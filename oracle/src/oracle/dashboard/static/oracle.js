/* Oracle dashboard — light feedback, no spam overlays */
(function () {
  function ensureOverlay() {
    var el = document.getElementById("nav-busy");
    if (el) return el;
    el = document.createElement("div");
    el.id = "nav-busy";
    el.innerHTML = '<div class="busy-card"><div class="spinner"></div><p>처리 중…</p></div>';
    document.body.appendChild(el);
    return el;
  }

  function showBusy(msg) {
    var el = ensureOverlay();
    var p = el.querySelector("p");
    if (p && msg) p.textContent = msg;
    el.classList.add("on");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[method='post']").forEach(function (form) {
      form.addEventListener("submit", function () {
        if (form.dataset.busy === "1") return;
        form.dataset.busy = "1";

        var btn = form.querySelector("button[type='submit'], button:not([type])");
        if (form.dataset.hideSelf === "1" || (btn && btn.dataset.hideWhile === "1")) {
          form.hidden = true;
          if (btn) btn.disabled = true;
          return; // page-specific live UI handles the rest
        }

        if (btn) {
          btn.disabled = true;
          btn.classList.add("is-loading");
        }

        if (form.dataset.noOverlay === "1") return;
        var label = (btn && btn.textContent) || "";
        showBusy(label.trim() ? label.trim() + "…" : "처리 중…");
      });
    });

    document.querySelectorAll("a.tab").forEach(function (a) {
      a.addEventListener("click", function () {
        if (a.getAttribute("href") && a.getAttribute("href").charAt(0) === "/") {
          // tiny soft feedback only for tab switches
          a.classList.add("is-loading");
        }
      });
    });
  });
})();
