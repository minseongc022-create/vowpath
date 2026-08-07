import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getConnections,
  saveConnection,
  type PlatformId,
} from "../connections/store.ts";
import { loadInbox } from "../notify/index.ts";
import { readEnvConfig, writeEnvConfig, maskSecret } from "../config/env-store.ts";
import { testAllConnections } from "../connections/test.ts";
import { getGenerateJob, startGenerateJob } from "./generate-job.ts";
import { buildGoogleAuthUrl, handleGoogleCallback } from "./oauth-google.ts";
import { loadEnvFile } from "../config/load.ts";

const PORT = Number(process.env.DASHBOARD_PORT ?? 3847);
const BASE = `http://127.0.0.1:${PORT}`;

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Content Autopilot</title>
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px;background:#0f1419;color:#e7e9ea;line-height:1.5}
    h1{font-size:1.5rem;margin:0}h2{font-size:1rem;margin:28px 0 12px;color:#1d9bf0}
    label{display:block;margin:10px 0 4px;font-size:.85rem;color:#71767b}
    input,select{width:100%;padding:10px;border:1px solid #38444d;border-radius:8px;background:#15202b;color:#e7e9ea}
    button,.btn{display:inline-block;margin-top:12px;margin-right:8px;padding:12px 18px;background:#1d9bf0;color:#fff;border:none;border-radius:999px;cursor:pointer;font-weight:600;text-decoration:none;font-size:.9rem}
    button:hover,.btn:hover{background:#1a8cd8}.btn-secondary{background:#38444d}.btn-secondary:hover{background:#536471}
    .ok{color:#00ba7c}.warn{color:#ffad1f;font-size:.85rem}.err{color:#f4212e}
    .card{background:#15202b;border:1px solid #38444d;border-radius:12px;padding:16px;margin:16px 0}
    pre{background:#0f1419;padding:12px;border-radius:8px;overflow:auto;font-size:.8rem}
    .hidden{display:none}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .pill{display:inline-block;padding:4px 10px;border-radius:999px;font-size:.75rem;background:#38444d;margin-right:6px}
    .pill.on{background:#005c4b;color:#00ba7c}
  </style>
</head>
<body>
  <h1>Content Autopilot</h1>
  <p class="warn">한 번에 설정 → 3개 플랫폼 글 자동 생성. 계정 정보는 이 PC에만 저장됩니다.</p>

  <div class="card">
    <h2>① LLM (글 작성 AI)</h2>
    <form id="llm">
      <label>OpenAI 호환 API 키</label>
      <input name="llmApiKey" type="password" placeholder="sk-..." autocomplete="off"/>
      <label>모델</label>
      <input name="llmModel" placeholder="gpt-4.1-mini"/>
      <button type="submit">API 키 저장</button>
    </form>
    <p id="llmStatus" class="warn"></p>
  </div>

  <div class="card">
    <h2>② 알림 (생성 완료 시)</h2>
    <form id="notify">
      <label>ntfy 토픽 (폰 앱에서 구독)</label>
      <input name="ntfyTopic" placeholder="content-autopilot-xxxx"/>
      <label>Webhook URL (선택, Discord/Slack)</label>
      <input name="webhookUrl" placeholder="https://discord.com/api/webhooks/..."/>
      <button type="submit">알림 설정 저장</button>
    </form>
    <p id="ntfyLink" class="warn"></p>
  </div>

  <div class="card">
    <h2>③ 플랫폼 연결</h2>
    <div id="connPills" class="row"></div>
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
        <input name="username"/>
        <label>앱 비밀번호 (WordPress → 사용자 → Application Passwords)</label>
        <input name="appPassword" type="password"/>
        <button type="button" class="btn-secondary" id="testWp">WordPress 연결 테스트</button>
      </div>
      <div id="fields-blogger" class="hidden">
        <label>Google OAuth (웹 로그인 — Blogger 자동 연결)</label>
        <label>Client ID</label>
        <input name="googleClientId" placeholder="xxx.apps.googleusercontent.com"/>
        <label>Client Secret</label>
        <input name="googleClientSecret" type="password"/>
        <button type="button" id="saveGoogle">Google OAuth 저장</button>
        <a class="btn" id="googleLogin" href="#">Google로 Blogger 로그인</a>
        <p class="warn">Google Cloud Console → OAuth 클라이언트 → 리디렉션 URI: <code id="redirectUri"></code></p>
        <label>Blog ID (수동 입력도 가능)</label>
        <input name="blogId"/>
        <label>Access Token (수동)</label>
        <input name="accessToken" type="password"/>
        <button type="button" class="btn-secondary" id="testBlogger">Blogger 연결 테스트</button>
      </div>
      <div id="fields-naver" class="hidden">
        <label>네이버 블로그 ID</label>
        <input name="naverId" placeholder="myblogid"/>
        <p class="warn">네이버는 공식 API 없음 → HTML 내보내기 후 글쓰기에 붙여넣기</p>
      </div>
      <button type="submit">플랫폼 저장</button>
    </form>
    <p id="connMsg"></p>
  </div>

  <div class="card">
    <h2>④ 3개 플랫폼 전부 생성</h2>
    <p>네이버 + WordPress + Blogger 각 1편 (2000자+, 사실 기반, 품질 검사)</p>
    <button id="generateAll" type="button">지금 전부 생성 + 알림</button>
    <pre id="jobStatus">대기 중</pre>
  </div>

  <div class="card">
    <h2>최근 알림</h2>
    <pre id="inbox">—</pre>
  </div>

  <script>
    document.getElementById('redirectUri').textContent = location.origin + '/oauth/google/callback';

    async function refresh() {
      const r = await fetch('/api/status');
      const j = await r.json();
      const pills = [];
      pills.push(j.tests?.wordpress?.ok ? '<span class="pill on">WordPress ✓</span>' : '<span class="pill">WordPress ✗</span>');
      pills.push(j.tests?.blogger?.ok ? '<span class="pill on">Blogger ✓</span>' : '<span class="pill">Blogger ✗</span>');
      pills.push(j.tests?.naver?.ok ? '<span class="pill on">Naver ✓</span>' : '<span class="pill">Naver ✗</span>');
      pills.push(j.env?.hasLlmKey ? '<span class="pill on">LLM ✓</span>' : '<span class="pill">LLM ✗</span>');
      document.getElementById('connPills').innerHTML = pills.join('');
      document.getElementById('llmStatus').textContent = j.env?.hasLlmKey ? 'API 키: ' + j.env.llmKeyMask : 'API 키 미설정 (mock 모드)';
      if (j.env?.ntfyTopic) {
        document.getElementById('ntfyLink').innerHTML = 'ntfy 구독: <a href="https://ntfy.sh/'+j.env.ntfyTopic+'" target="_blank">https://ntfy.sh/'+j.env.ntfyTopic+'</a>';
        document.querySelector('[name=ntfyTopic]').value = j.env.ntfyTopic;
      }
      document.querySelector('[name=llmModel]').value = j.env?.llmModel || 'gpt-4.1-mini';
      document.querySelector('[name=googleClientId]').value = j.env?.googleClientId || '';
      const c = j.connections || {};
      if (c.wordpress) {
        document.querySelector('[name=siteUrl]').value = c.wordpress.baseUrl || '';
        document.querySelector('[name=username]').value = c.wordpress.username || '';
      }
      if (c.blogger) document.querySelector('[name=blogId]').value = c.blogger.blogId || '';
      if (c.naver) document.querySelector('[name=naverId]').value = c.naver.blogId || '';
      document.getElementById('inbox').textContent = j.inbox ? JSON.stringify(j.inbox, null, 2) : '(알림 없음)';
      if (j.job) document.getElementById('jobStatus').textContent = JSON.stringify(j.job, null, 2);
    }

    const plat = document.getElementById('platform');
    function showFields() {
      ['wp','blogger','naver'].forEach(p => document.getElementById('fields-'+p).classList.add('hidden'));
      const m = { wordpress: 'wp', blogger: 'blogger', naver: 'naver' };
      document.getElementById('fields-'+m[plat.value]).classList.remove('hidden');
    }
    plat.onchange = showFields; showFields();
    refresh();
    setInterval(refresh, 4000);

    document.getElementById('llm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await fetch('/api/settings/llm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(fd)) });
      const j = await r.json();
      document.getElementById('llmStatus').textContent = j.ok ? '저장됨 ✓' : j.error;
      refresh();
    };

    document.getElementById('notify').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await fetch('/api/settings/notify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(fd)) });
      await r.json();
      refresh();
    };

    document.getElementById('conn').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await fetch('/api/connect', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(fd)) });
      const j = await r.json();
      document.getElementById('connMsg').textContent = j.ok ? '저장됨 ✓' : (j.error || '오류');
      document.getElementById('connMsg').className = j.ok ? 'ok' : 'err';
      refresh();
    };

    document.getElementById('saveGoogle').onclick = async () => {
      const body = {
        googleClientId: document.querySelector('[name=googleClientId]').value,
        googleClientSecret: document.querySelector('[name=googleClientSecret]').value,
      };
      await fetch('/api/settings/google', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      refresh();
    };

    document.getElementById('googleLogin').onclick = async (e) => {
      e.preventDefault();
      const blogId = document.querySelector('[name=blogId]').value;
      const r = await fetch('/api/oauth/google/start' + (blogId ? '?blogId='+encodeURIComponent(blogId) : ''));
      const j = await r.json();
      if (j.url) location.href = j.url;
      else alert(j.error || 'Google OAuth 설정 필요');
    };

    document.getElementById('testWp').onclick = async () => {
      const r = await fetch('/api/test/wordpress');
      const j = await r.json();
      alert(j.detail);
      refresh();
    };
    document.getElementById('testBlogger').onclick = async () => {
      const r = await fetch('/api/test/blogger');
      const j = await r.json();
      alert(j.detail);
      refresh();
    };

    document.getElementById('generateAll').onclick = async () => {
      document.getElementById('jobStatus').textContent = '생성 중…';
      const r = await fetch('/api/generate-all', { method: 'POST' });
      const j = await r.json();
      document.getElementById('jobStatus').textContent = JSON.stringify(j, null, 2);
    };

    const params = new URLSearchParams(location.search);
    if (params.get('oauth') === 'ok') alert('Blogger 연결 완료!');
    if (params.get('oauth') === 'err') alert('OAuth 실패: ' + params.get('msg'));
  </script>
</body>
</html>`;

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function json(res: ServerResponse, code: number, data: unknown): void {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function startDashboard(): void {
  loadEnvFile();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", BASE);

    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(HTML);
      return;
    }

    if (url.pathname === "/api/status" && req.method === "GET") {
      const connections = await getConnections();
      const inbox = await loadInbox();
      const env = readEnvConfig();
      const tests = await testAllConnections();
      json(res, 200, {
        connections,
        inbox,
        job: getGenerateJob(),
        env: {
          hasLlmKey: Boolean(env.LLM_API_KEY),
          llmKeyMask: maskSecret(env.LLM_API_KEY),
          llmModel: env.LLM_MODEL || "gpt-4.1-mini",
          ntfyTopic: env.NTFY_TOPIC,
          googleClientId: env.GOOGLE_CLIENT_ID,
        },
        tests: Object.fromEntries(tests.map((t) => [t.platform, t])),
      });
      return;
    }

    if (url.pathname === "/api/settings/llm" && req.method === "POST") {
      try {
        const data = JSON.parse(await readBody(req)) as Record<string, string>;
        const updates: Record<string, string> = { MOCK_LLM: "0" };
        if (data.llmApiKey) updates.LLM_API_KEY = data.llmApiKey;
        if (data.llmModel) updates.LLM_MODEL = data.llmModel;
        writeEnvConfig(updates);
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, 400, { ok: false, error: String(e) });
      }
      return;
    }

    if (url.pathname === "/api/settings/notify" && req.method === "POST") {
      try {
        const data = JSON.parse(await readBody(req)) as Record<string, string>;
        const updates: Record<string, string> = {};
        if (data.ntfyTopic) updates.NTFY_TOPIC = data.ntfyTopic;
        if (data.webhookUrl) updates.NOTIFY_WEBHOOK_URL = data.webhookUrl;
        writeEnvConfig(updates);
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, 400, { ok: false, error: String(e) });
      }
      return;
    }

    if (url.pathname === "/api/settings/google" && req.method === "POST") {
      try {
        const data = JSON.parse(await readBody(req)) as Record<string, string>;
        writeEnvConfig({
          GOOGLE_CLIENT_ID: data.googleClientId || "",
          GOOGLE_CLIENT_SECRET: data.googleClientSecret || "",
        });
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, 400, { ok: false, error: String(e) });
      }
      return;
    }

    if (url.pathname === "/api/connect" && req.method === "POST") {
      try {
        const data = JSON.parse(await readBody(req)) as Record<string, string>;
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
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, 400, { ok: false, error: String(e) });
      }
      return;
    }

    if (url.pathname === "/api/oauth/google/start" && req.method === "GET") {
      const env = readEnvConfig();
      if (!env.GOOGLE_CLIENT_ID) {
        json(res, 400, { error: "Google Client ID를 먼저 저장하세요" });
        return;
      }
      const redirectUri = `${BASE}/oauth/google/callback`;
      const authUrl = buildGoogleAuthUrl(env.GOOGLE_CLIENT_ID, redirectUri, url.searchParams.get("blogId") || undefined);
      json(res, 200, { url: authUrl });
      return;
    }

    if (url.pathname === "/oauth/google/callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const env = readEnvConfig();
      if (!code || !state || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        res.writeHead(302, { Location: "/?oauth=err&msg=missing_params" });
        res.end();
        return;
      }
      const result = await handleGoogleCallback({
        code,
        state,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${BASE}/oauth/google/callback`,
      });
      if (result.ok) {
        res.writeHead(302, { Location: "/?oauth=ok" });
      } else {
        res.writeHead(302, { Location: `/?oauth=err&msg=${encodeURIComponent(result.error)}` });
      }
      res.end();
      return;
    }

    if (url.pathname === "/api/test/wordpress" && req.method === "GET") {
      const { testWordPress } = await import("../connections/test.ts");
      json(res, 200, await testWordPress());
      return;
    }

    if (url.pathname === "/api/test/blogger" && req.method === "GET") {
      const { testBlogger } = await import("../connections/test.ts");
      json(res, 200, await testBlogger());
      return;
    }

    if (url.pathname === "/api/generate-all" && req.method === "POST") {
      const job = await startGenerateJob();
      json(res, 200, job);
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
