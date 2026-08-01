/* Oracle dashboard — light feedback, no spam overlays + USD/KRW toggle */
(function () {
  var FX_KEY = "oracle_ccy";
  var rate = 1380;

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

  function currentCcy() {
    try {
      return localStorage.getItem(FX_KEY) === "KRW" ? "KRW" : "USD";
    } catch (e) {
      return "USD";
    }
  }

  function setCcy(ccy) {
    try {
      localStorage.setItem(FX_KEY, ccy);
    } catch (e) {}
    applyMoney(ccy);
    document.querySelectorAll(".fx-toggle .fx-btn").forEach(function (btn) {
      btn.classList.toggle("on", btn.dataset.ccy === ccy);
    });
  }

  function fmtUsd(n, signed) {
    var abs = Math.abs(n);
    var body = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (signed) return (n >= 0 ? "+$" : "-$") + body;
    return "$" + body;
  }

  function fmtKrw(n, signed) {
    var won = Math.round(n * rate);
    var abs = Math.abs(won);
    var body = abs.toLocaleString("ko-KR");
    if (signed) return (won >= 0 ? "+₩" : "-₩") + body;
    return "₩" + body;
  }

  function applyMoney(ccy) {
    document.querySelectorAll(".money[data-usd]").forEach(function (el) {
      var n = parseFloat(el.getAttribute("data-usd"));
      if (isNaN(n)) return;
      var signed = el.getAttribute("data-signed") === "1";
      el.textContent = ccy === "KRW" ? fmtKrw(n, signed) : fmtUsd(n, signed);
    });
    var hint = document.getElementById("fx-hint");
    if (hint && rate) {
      hint.textContent =
        "1달러 ≈ " +
        Math.round(rate).toLocaleString("ko-KR") +
        "원 · 지금 " +
        (ccy === "KRW" ? "원화" : "달러") +
        "로 보는 중";
    }
    document.documentElement.setAttribute("data-ccy", ccy);
  }

  function wireToggle(root) {
    if (!root) return;
    var r = parseFloat(root.getAttribute("data-rate") || "");
    if (!isNaN(r) && r > 0) rate = r;
    root.querySelectorAll(".fx-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setCcy(btn.dataset.ccy || "USD");
      });
    });
  }

  function refreshRate() {
    fetch("/api/fx")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (j && j.usdkrw) {
          rate = Number(j.usdkrw) || rate;
          document.querySelectorAll(".fx-toggle").forEach(function (el) {
            el.setAttribute("data-rate", String(rate));
          });
          applyMoney(currentCcy());
        }
      })
      .catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".fx-toggle").forEach(wireToggle);
    setCcy(currentCcy());
    refreshRate();

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
          a.classList.add("is-loading");
        }
      });
    });
  });
})();
