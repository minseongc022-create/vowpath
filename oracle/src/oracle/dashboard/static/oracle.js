/* Oracle dashboard UX helpers */
(function () {
  function scrollToTarget() {
    var hash = (location.hash || "").replace("#", "");
    var prefer =
      hash ||
      (document.body.getAttribute("data-scroll") || "") ||
      (document.querySelector("[data-autoscroll]") &&
        document.querySelector("[data-autoscroll]").getAttribute("data-autoscroll"));

    var el = null;
    if (prefer) el = document.getElementById(prefer);
    if (!el) el = document.getElementById("pending-approvals");
    if (!el) el = document.getElementById("action-cta");
    if (!el) el = document.querySelector(".flash");
    if (!el) return;

    // wait for layout / soft keyboard
    setTimeout(function () {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("pulse-focus");
      var btn = el.querySelector("button.btn-primary, .btn.btn-primary");
      if (btn) {
        try {
          btn.focus({ preventScroll: true });
        } catch (e) {}
      }
    }, 180);
  }

  document.addEventListener("DOMContentLoaded", scrollToTarget);
  window.addEventListener("hashchange", scrollToTarget);

  // After POST redirects that land with flash, nudge to pending
  if (document.querySelector(".flash") && document.getElementById("pending-approvals")) {
    if (!location.hash) location.hash = "pending-approvals";
  }
})();
