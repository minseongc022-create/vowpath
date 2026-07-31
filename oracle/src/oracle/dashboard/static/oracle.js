/* Oracle dashboard — instant feedback + auto-scroll */
(function () {
  function ensureOverlay() {
    var el = document.getElementById("nav-busy");
    if (el) return el;
    el = document.createElement("div");
    el.id = "nav-busy";
    el.innerHTML = '<div class="busy-card"><div class="spinner"></div><p>바로 처리 중…</p></div>';
    document.body.appendChild(el);
    return el;
  }

  function showBusy(msg) {
    var el = ensureOverlay();
    var p = el.querySelector("p");
    if (p && msg) p.textContent = msg;
    el.classList.add("on");
  }

  function scrollToTarget() {
    var hash = (location.hash || "").replace("#", "");
    var prefer =
      hash ||
      (document.body.getAttribute("data-scroll") || "") ||
      (document.querySelector("[data-autoscroll]") &&
        document.querySelector("[data-autoscroll]").getAttribute("data-autoscroll"));

    var el = null;
    if (prefer) el = document.getElementById(prefer);
    if (!el && document.querySelector(".flash")) el = document.getElementById("pending-approvals");
    if (!el) el = document.getElementById("action-cta");
    if (!el) return;

    requestAnimationFrame(function () {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("pulse-focus");
      var btn = el.querySelector("button.btn-primary, .btn.btn-primary");
      if (btn) {
        try { btn.focus({ preventScroll: true }); } catch (e) {}
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    scrollToTarget();

    // Instant tap feedback on every form POST
    document.querySelectorAll("form[method='post']").forEach(function (form) {
      form.addEventListener("submit", function () {
        if (form.dataset.busy === "1") return;
        form.dataset.busy = "1";
        var btn = form.querySelector("button[type='submit'], button:not([type])");
        if (btn) {
          btn.disabled = true;
          btn.classList.add("is-loading");
        }
        var label = (btn && btn.textContent) || "";
        showBusy(label.trim() ? label.trim() + "…" : "처리 중…");
      });
    });

    // Instant feel on tab links
    document.querySelectorAll("a.tab, a.ql, a.btn").forEach(function (a) {
      a.addEventListener("click", function () {
        if (a.getAttribute("href") && a.getAttribute("href").charAt(0) === "/") {
          showBusy("이동 중…");
        }
      });
    });
  });

  window.addEventListener("hashchange", scrollToTarget);
  if (document.querySelector(".flash") && document.getElementById("pending-approvals")) {
    if (!location.hash) location.hash = "pending-approvals";
  }
})();
