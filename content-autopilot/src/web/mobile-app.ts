export function getMobileHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"/>
  <meta name="theme-color" content="#1d9bf0"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="Autopilot"/>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="apple-touch-icon" href="/icon-192.svg"/>
  <title>Autopilot</title>
  <style>
    :root{--bg:#0f1419;--card:#15202b;--line:#38444d;--text:#e7e9ea;--muted:#71767b;--blue:#1d9bf0;--green:#00ba7c;--warn:#ffad1f;--safe-bottom:env(safe-area-inset-bottom,0px);--nav-h:64px}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.45;padding-bottom:calc(var(--nav-h) + var(--safe-bottom) + 12px)}
    .top{position:sticky;top:0;z-index:10;background:rgba(15,20,25,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);padding:14px 16px 10px;padding-top:calc(14px + env(safe-area-inset-top,0px))}
    .top h1{margin:0;font-size:1.15rem}
    .top p{margin:4px 0 0;font-size:.78rem;color:var(--muted)}
    main{padding:12px 16px 0}
    .panel{display:none}.panel.on{display:block}
    .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}
    .status-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .chip{padding:12px;border-radius:12px;background:#0f1419;border:1px solid var(--line);font-size:.82rem;text-align:center}
    .chip.ok{border-color:#005c4b;color:var(--green)}
    .chip.no{color:var(--muted)}
    .big-btn{display:block;width:100%;border:none;border-radius:16px;padding:18px 16px;font-size:1.05rem;font-weight:700;color:#fff;background:linear-gradient(135deg,#1d9bf0,#1781c9);margin:8px 0;cursor:pointer;touch-action:manipulation}
    .big-btn:active{transform:scale(.98)}.big-btn.secondary{background:#38444d;font-size:.95rem;padding:14px}
    .big-btn:disabled{opacity:.55}
    label{display:block;margin:12px 0 6px;font-size:.82rem;color:var(--muted)}
    input,select,textarea{width:100%;padding:14px;border:1px solid var(--line);border-radius:12px;background:#0f1419;color:var(--text);font-size:16px}
    textarea{min-height:88px;resize:vertical}
    .row{display:flex;gap:8px;flex-wrap:wrap}
    .row>*{flex:1}
    .nav{position:fixed;left:0;right:0;bottom:0;display:flex;background:rgba(21,32,43,.96);backdrop-filter:blur(12px);border-top:1px solid var(--line);padding-bottom:var(--safe-bottom);height:calc(var(--nav-h) + var(--safe-bottom));z-index:20}
    .nav button{flex:1;border:none;background:none;color:var(--muted);font-size:.72rem;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}
    .nav button.on{color:var(--blue)}.nav button span{font-size:1.25rem}
    .result-item{padding:12px 0;border-bottom:1px solid var(--line);font-size:.88rem}
    .result-item:last-child{border:none}
    .result-item strong{display:block;margin-bottom:4px}
    .muted{color:var(--muted);font-size:.8rem}
    .toast{position:fixed;left:16px;right:16px;bottom:calc(var(--nav-h) + var(--safe-bottom) + 12px);background:#15202b;border:1px solid var(--line);padding:12px 14px;border-radius:12px;font-size:.88rem;transform:translateY(120%);transition:.25s;z-index:30}
    .toast.show{transform:translateY(0)}
    .progress{height:6px;background:#0f1419;border-radius:99px;overflow:hidden;margin:10px 0}
    .progress>i{display:block;height:100%;width:0;background:var(--blue);transition:width .3s}
    details summary{cursor:pointer;font-weight:600;padding:8px 0;list-style:none}
    details summary::-webkit-details-marker{display:none}
    .install-banner{background:#172554;border:1px solid #1d4ed8;border-radius:12px;padding:12px;margin-bottom:12px;font-size:.85rem}
    .qr{text-align:center}.qr img{max-width:180px;border-radius:12px;background:#fff;padding:8px}
    a.link{color:var(--blue);word-break:break-all}
  </style>
</head>
<body>
  <header class="top">
    <h1>Content Autopilot</h1>
    <p id="subtitle">폰에서 3개 플랫폼 글 생성</p>
  </header>

  <main>
    <section id="panel-home" class="panel on">
      <div id="installBanner" class="install-banner hidden">
        📲 Safari/Chrome 메뉴 → <strong>홈 화면에 추가</strong> 하면 앱처럼 쓸 수 있어요.
      </div>
      <div class="card">
        <div class="status-grid" id="statusGrid"></div>
      </div>
      <button class="big-btn" id="btnGenerate">✨ 3개 플랫폼 전부 생성</button>
      <button class="big-btn secondary" id="btnNtfy">🔔 폰 알림 켜기 (ntfy)</button>
      <div class="card" id="jobCard">
        <strong>진행 상태</strong>
        <div class="progress"><i id="progressBar"></i></div>
        <div id="jobText" class="muted">대기 중</div>
      </div>
      <div class="card">
        <strong>최근 생성</strong>
        <div id="recentList" class="muted">불러오는 중…</div>
      </div>
    </section>

    <section id="panel-connect" class="panel">
      <div class="card">
        <p class="muted">네이버는 ID만, WordPress/Blogger는 아래에서 연결</p>
        <form id="formNaver">
          <label>네이버 블로그 ID</label>
          <input name="naverId" placeholder="myblogid" autocapitalize="none"/>
          <button class="big-btn secondary" type="submit">네이버 저장</button>
        </form>
      </div>
      <div class="card">
        <details open>
          <summary>WordPress</summary>
          <form id="formWp">
            <label>사이트 URL</label>
            <input name="siteUrl" placeholder="https://..." inputmode="url" autocapitalize="none"/>
            <label>사용자명</label>
            <input name="username" autocapitalize="none"/>
            <label>앱 비밀번호</label>
            <input name="appPassword" type="password" autocomplete="off"/>
            <div class="row">
              <button class="big-btn secondary" type="button" id="testWp">테스트</button>
              <button class="big-btn secondary" type="submit">저장</button>
            </div>
          </form>
        </details>
      </div>
      <div class="card">
        <details>
          <summary>Google Blogger</summary>
          <form id="formGoogle">
            <label>Client ID / Secret (1회)</label>
            <input name="googleClientId" placeholder="xxx.apps.googleusercontent.com" autocapitalize="none"/>
            <input name="googleClientSecret" type="password" placeholder="Client Secret" style="margin-top:8px"/>
            <button class="big-btn secondary" type="submit">OAuth 저장</button>
          </form>
          <button class="big-btn" type="button" id="googleLogin" style="margin-top:8px">Google로 Blogger 로그인</button>
          <p class="muted">리디렉션 URI: <code id="redirectUri"></code></p>
        </details>
      </div>
    </section>

    <section id="panel-settings" class="panel">
      <div class="card">
        <form id="formLlm">
          <label>LLM API 키 (OpenAI 등)</label>
          <input name="llmApiKey" type="password" placeholder="sk-..." autocomplete="off"/>
          <label>모델</label>
          <input name="llmModel" value="gpt-4.1-mini"/>
          <button class="big-btn secondary" type="submit">API 키 저장</button>
        </form>
        <p id="llmStatus" class="muted"></p>
      </div>
      <div class="card">
        <form id="formNotify">
          <label>ntfy 토픽</label>
          <input name="ntfyTopic" autocapitalize="none"/>
          <button class="big-btn secondary" type="submit">알림 저장</button>
        </form>
        <p id="ntfyInfo" class="muted"></p>
      </div>
      <div class="card" id="phoneAccess">
        <strong>📱 이 폰에서 PC 접속</strong>
        <p class="muted">PC와 같은 Wi‑Fi에서 아래 주소로 접속하세요.</p>
        <div id="lanUrls"></div>
        <div class="qr" id="qrBox"></div>
      </div>
    </section>
  </main>

  <nav class="nav">
    <button type="button" class="on" data-tab="home"><span>🏠</span>홈</button>
    <button type="button" data-tab="connect"><span>🔗</span>연결</button>
    <button type="button" data-tab="settings"><span>⚙️</span>설정</button>
  </nav>

  <div class="toast" id="toast"></div>

  <script>
    const $ = (s) => document.querySelector(s);
    const toast = (msg) => {
      const t = $('#toast'); t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    };

    document.getElementById('redirectUri').textContent = location.origin + '/oauth/google/callback';

    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) {
      $('#installBanner').classList.remove('hidden');
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    document.querySelectorAll('.nav button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
        $('#panel-' + btn.dataset.tab).classList.add('on');
      };
    });

    function renderStatus(j) {
      const items = [
        ['LLM', j.env?.hasLlmKey],
        ['WordPress', j.tests?.wordpress?.ok],
        ['Blogger', j.tests?.blogger?.ok],
        ['Naver', j.tests?.naver?.ok],
      ];
      $('#statusGrid').innerHTML = items.map(([n, ok]) =>
        '<div class="chip ' + (ok ? 'ok' : 'no') + '">' + n + (ok ? ' ✓' : '') + '</div>'
      ).join('');

      $('#llmStatus').textContent = j.env?.hasLlmKey ? ('API 키: ' + j.env.llmKeyMask) : 'API 키 없음 → mock 모드';
      if (j.env?.ntfyTopic) {
        $('[name=ntfyTopic]').value = j.env.ntfyTopic;
        $('#ntfyInfo').innerHTML = '토픽: <a class="link" href="https://ntfy.sh/'+j.env.ntfyTopic+'">'+j.env.ntfyTopic+'</a>';
      }
      if (j.env?.llmModel) $('[name=llmModel]').value = j.env.llmModel;
      if (j.env?.googleClientId) $('[name=googleClientId]').value = j.env.googleClientId;

      const c = j.connections || {};
      if (c.naver?.blogId) $('[name=naverId]').value = c.naver.blogId;
      if (c.wordpress) {
        $('[name=siteUrl]').value = c.wordpress.baseUrl || '';
        $('[name=username]').value = c.wordpress.username || '';
      }

      const job = j.job;
      const btn = $('#btnGenerate');
      if (job?.status === 'running') {
        btn.disabled = true;
        $('#progressBar').style.width = '60%';
        $('#jobText').textContent = '생성 중… 잠시만요';
      } else if (job?.status === 'done') {
        btn.disabled = false;
        $('#progressBar').style.width = '100%';
        $('#jobText').textContent = '완료! ' + (job.results?.length || 0) + '편';
      } else if (job?.status === 'error') {
        btn.disabled = false;
        $('#progressBar').style.width = '0%';
        $('#jobText').textContent = '오류: ' + job.error;
      } else {
        btn.disabled = false;
        $('#progressBar').style.width = '0%';
        $('#jobText').textContent = '버튼 한 번이면 3플랫폼 생성 + 알림';
      }

      if (j.inbox?.results?.length) {
        $('#recentList').innerHTML = j.inbox.results.map(r =>
          '<div class="result-item"><strong>' + r.title + '</strong><span class="muted">' +
          r.chars + '자 · ' + r.platform + '</span></div>'
        ).join('');
      } else if (j.inbox?.body) {
        $('#recentList').innerHTML = '<pre style="white-space:pre-wrap;font-size:.8rem;margin:0">' + j.inbox.body + '</pre>';
      }
    }

    async function refresh() {
      const r = await fetch('/api/status');
      renderStatus(await r.json());
    }

    async function loadNetwork() {
      const r = await fetch('/api/network');
      const j = await r.json();
      const here = location.origin;
      let html = '<p><a class="link" href="'+here+'">'+here+'</a></p>';
      if (j.lan?.length) {
        html += j.lan.map(u => '<p><a class="link" href="'+u+'">'+u+'</a></p>').join('');
        const phoneUrl = j.lan[0];
        $('#qrBox').innerHTML = '<img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(phoneUrl)+'"/><p class="muted">QR 스캔 → 폰 브라우저</p>';
      } else {
        $('#qrBox').innerHTML = '<p class="muted">Wi‑Fi IP 없음 (모바일 데이터만 사용 중?)</p>';
      }
      $('#lanUrls').innerHTML = html;
    }

    refresh(); loadNetwork();
    setInterval(refresh, 3500);

    $('#btnGenerate').onclick = async () => {
      $('#btnGenerate').disabled = true;
      $('#progressBar').style.width = '30%';
      $('#jobText').textContent = '시작…';
      await fetch('/api/generate-all', { method: 'POST' });
      toast('생성 시작! 완료되면 ntfy 알림');
      refresh();
    };

    $('#btnNtfy').onclick = async () => {
      const r = await fetch('/api/status');
      const j = await r.json();
      const topic = j.env?.ntfyTopic;
      if (!topic) { toast('설정에서 ntfy 토픽 저장'); return; }
      const web = 'https://ntfy.sh/' + topic;
      const app = 'ntfy://subscribe/' + topic;
      if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        window.location.href = app;
        setTimeout(() => { window.location.href = web; }, 800);
      } else {
        window.open(web, '_blank');
      }
    };

    $('#formNaver').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await fetch('/api/connect', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ platform:'naver', naverId: fd.get('naverId') })});
      const j = await r.json();
      toast(j.ok ? '네이버 저장 ✓' : j.error);
      refresh();
    };

    $('#formWp').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd); body.platform = 'wordpress';
      const r = await fetch('/api/connect', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      toast((await r.json()).ok ? 'WordPress 저장 ✓' : '저장 실패');
      refresh();
    };

    $('#formGoogle').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await fetch('/api/settings/google', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(fd)) });
      toast('Google OAuth 저장 ✓');
      refresh();
    };

    $('#formLlm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch('/api/settings/llm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      toast('API 키 저장 ✓');
      refresh();
    };

    $('#formNotify').onsubmit = async (e) => {
      e.preventDefault();
      await fetch('/api/settings/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      toast('알림 저장 ✓');
      refresh();
    };

    $('#testWp').onclick = async () => {
      const j = await (await fetch('/api/test/wordpress')).json();
      toast(j.detail);
    };

    $('#googleLogin').onclick = async () => {
      const r = await fetch('/api/oauth/google/start');
      const j = await r.json();
      if (j.url) location.href = j.url;
      else toast(j.error || 'OAuth 설정 필요');
    };

    const params = new URLSearchParams(location.search);
    if (params.get('oauth') === 'ok') toast('Blogger 연결 완료 ✓');
    if (params.get('oauth') === 'err') toast('OAuth 실패');
  </script>
</body>
</html>`;
}
