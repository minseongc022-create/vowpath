import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getConnections,
  saveConnection,
  type PlatformId,
} from "../connections/store.ts";
import { loadInbox } from "../notify/index.ts";

const PORT = Number(process.env.DASHBOARD_PORT ?? 3847);

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Content Autopilot — 연결</title>
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#0f1419;color:#e7e9ea}
    h1{font-size:1.4rem}h2{font-size:1rem;margin-top:28px;color:#1d9bf0}
    label{display:block;margin:12px 0 4px;font-size:.85rem;color:#71767b}
    input,select,textarea{width:100%;padding:10px;border:1px solid #38444d;border-radius:8px;background:#15202b;color:#e7e9ea}
    button{margin-top:16px;padding:12px 20px;background:#1d9bf0;color:#fff;border:none;border-radius:999px;cursor:pointer;font-weight:600}
    button:hover{background:#1a8cd8}.ok{color:#00ba7c}.warn{color:#ffad1f;font-size:.85rem;margin-top:8px}
    .card{background:#15202b;border:1px solid #38444d;border-radius:12px;padding:16px;margin:16px 0}
    .status{font-size:.9rem}.hidden{display:none}
    a{color:#1d9bf0}
  </style>
</head>
<body>
  <h1>Content Autopilot</h1>
  <p class="warn">개인용 로컬 대시보드 — 블로그 계정 정보는 이 PC의 <code>data/connections.json</code>에만 저장됩니다.</p>

  <div class="card">
    <h2>플랫폼 연결</h2>
    <form id="conn">
      <label>플랫폼</label>
      <select name="platform" id="platform">
        <option value="wordpress">WordPress</option>
        <option value="blogger">Google Blogger</option>
        <option value="naver">네이버 블로그</option>
      </select>
      <div id="fields-wp">
        <label>사이트 URL</label>
        <input name="siteUrl" placeholder="https://yoursite.com"/>
        <label>사용자명</label>
        <input name="username" placeholder="admin"/>
        <label>앱 비밀번호 (WordPress → 사용자 → Application Passwords)</label>
        <input name="appPassword" type="password" placeholder="xxxx xxxx xxxx"/>
      </div>
      <div id="fields-blogger" class="hidden">
        <label>Blog ID (블로그 설정 URL에서 확인)</label>
        <input name="blogId" placeholder="1234567890123456789"/>
        <label>OAuth Access Token (<a href="https://developers.google.com/oauthplayground" target="_blank">OAuth Playground</a> → Blogger API v3)</label>
        <input name="accessToken" type="password" placeholder="ya29...."/>
      </div>
      <div id="fields-naver" class="hidden">
        <label>네이버 ID (블로그 주소 확인용)</label>
        <input name="naverId" placeholder="myblogid"/>
        <p class="warn">네이버는 공식 글쓰기 API가 없어 자동 발행 대신 <strong>HTML 내보내기</strong> 후 붙여넣기 방식을 사용합니다. 로그인은 네이버에서 직접 하세요.</p>
      </div>
      <button type="submit">저장</button>
    </form>
    <p id="msg"></p>
  </div>

  <div class="card">
    <h2>연결 상태</h2>
    <pre id="status" class="status">불러오는 중…</pre>
  </div>

  <div class="card">
    <h2>최근 알림</h2>
    <pre id="inbox" class="status">—</pre>
  </div>

  <script>
    const plat = document.getElementById('platform');
    function showFields() {
      ['wp','blogger','naver'].forEach(p => {
        document.getElementById('fields-'+p).classList.add('hidden');
      });
      const m = { wordpress: 'wp', blogger: 'blogger', naver: 'naver' };
      document.getElementById('fields-'+m[plat.value]).classList.remove('hidden');
    }
    plat.onchange = showFields; showFields();

    async function refresh() {
      const r = await fetch('/api/status');
      const j = await r.json();
      document.getElementById('status').textContent = JSON.stringify(j.connections, null, 2);
      document.getElementById('inbox').textContent = j.inbox ? JSON.stringify(j.inbox, null, 2) : '(알림 없음)';
    }
    refresh();

    document.getElementById('conn').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd);
      const r = await fetch('/api/connect', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j = await r.json();
      document.getElementById('msg').textContent = j.ok ? '저장됨 ✓' : (j.error || '오류');
      document.getElementById('msg').className = j.ok ? 'ok' : 'warn';
      refresh();
    };
  </script>
</body>
</html>`;

export function startDashboard(): void {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(HTML);
      return;
    }

    if (url.pathname === "/api/status" && req.method === "GET") {
      const connections = await getConnections();
      const inbox = await loadInbox();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ connections, inbox }));
      return;
    }

    if (url.pathname === "/api/connect" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      try {
        const data = JSON.parse(body) as Record<string, string>;
        const platform = data.platform as PlatformId;
        if (platform === "wordpress") {
          await saveConnection("wordpress", {
            siteUrl: data.siteUrl?.replace(/\/$/, "") ?? "",
            username: data.username ?? "",
            appPassword: data.appPassword ?? "",
          });
        } else if (platform === "blogger") {
          await saveConnection("blogger", {
            blogId: data.blogId ?? "",
            accessToken: data.accessToken ?? "",
          });
        } else if (platform === "naver") {
          await saveConnection("naver", { naverId: data.naverId ?? "" });
        } else {
          throw new Error("unknown platform");
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
      return;
    }

    if (url.pathname.startsWith("/data/")) {
      try {
        const filePath = path.join(process.cwd(), url.pathname.slice(1));
        const content = await readFile(filePath, "utf8");
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Dashboard: http://127.0.0.1:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startDashboard();
}
