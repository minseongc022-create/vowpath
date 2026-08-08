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
import { getMobileHtml } from "./mobile-app.ts";
import { getDashboardUrls } from "./network.ts";
import { ICON_192, ICON_512, MANIFEST, SERVICE_WORKER } from "./pwa.ts";
import {
  createSession,
  ensureDashboardPin,
  getDashboardPin,
  isAuthed,
  loginPageHtml,
  verifyPin,
} from "./auth.ts";
import { startPublicTunnel } from "./tunnel.ts";
import { log } from "../lib/utils.ts";

const PORT = Number(process.env.DASHBOARD_PORT ?? 3847);
const HOST = process.env.DASHBOARD_HOST ?? "0.0.0.0";

let publicUrl: string | null = process.env.PUBLIC_URL || null;

function requestBase(req: IncomingMessage): string {
  if (publicUrl) return publicUrl.replace(/\/$/, "");
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  return `${proto}://${host}`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function json(res: ServerResponse, code: number, data: unknown): void {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function needsAuth(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (pathname === "/manifest.json" || pathname === "/sw.js") return false;
  if (pathname.startsWith("/icon-")) return false;
  if (pathname === "/oauth/google/callback") return false;
  return true;
}

export async function startDashboard(opts?: { public?: boolean }): Promise<void> {
  loadEnvFile();
  const pin = ensureDashboardPin();

  const server = createServer(async (req, res) => {
    const base = requestBase(req);
    const url = new URL(req.url ?? "/", base);
    const pathname = url.pathname;

    if (pathname === "/login" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(loginPageHtml());
      return;
    }

    if (pathname === "/login" && req.method === "POST") {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      const pinIn = params.get("pin") || "";
      if (verifyPin(pinIn)) {
        const session = createSession();
        res.writeHead(302, { Location: "/", "Set-Cookie": session.setCookie });
        res.end();
      } else {
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end(loginPageHtml("PIN이 틀렸습니다"));
      }
      return;
    }

    if (needsAuth(pathname) && !isAuthed(req.headers.cookie)) {
      if (pathname.startsWith("/api/")) {
        json(res, 401, { error: "login required", login: "/login" });
        return;
      }
      res.writeHead(302, { Location: "/login" });
      res.end();
      return;
    }

    if (pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getMobileHtml());
      return;
    }

    if (pathname === "/manifest.json") {
      json(res, 200, MANIFEST);
      return;
    }

    if (pathname === "/sw.js") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(SERVICE_WORKER);
      return;
    }

    if (pathname === "/icon-192.svg") {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end(ICON_192);
      return;
    }

    if (pathname === "/icon-512.svg") {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end(ICON_512);
      return;
    }

    if (pathname === "/api/network" && req.method === "GET") {
      const urls = getDashboardUrls(PORT);
      json(res, 200, {
        local: urls.local,
        lan: urls.lan,
        public: publicUrl,
        port: PORT,
      });
      return;
    }

    if (pathname === "/api/status" && req.method === "GET") {
      const connections = await getConnections();
      const inbox = await loadInbox();
      const env = readEnvConfig();
      const tests = await testAllConnections();
      json(res, 200, {
        connections,
        inbox,
        job: getGenerateJob(),
        publicUrl,
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

    if (pathname === "/api/settings/llm" && req.method === "POST") {
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

    if (pathname === "/api/settings/notify" && req.method === "POST") {
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

    if (pathname === "/api/settings/google" && req.method === "POST") {
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

    if (pathname === "/api/connect" && req.method === "POST") {
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

    if (pathname === "/api/oauth/google/start" && req.method === "GET") {
      const env = readEnvConfig();
      if (!env.GOOGLE_CLIENT_ID) {
        json(res, 400, { error: "Google Client ID를 먼저 저장하세요" });
        return;
      }
      const redirectUri = `${base}/oauth/google/callback`;
      const authUrl = buildGoogleAuthUrl(
        env.GOOGLE_CLIENT_ID,
        redirectUri,
        url.searchParams.get("blogId") || undefined,
      );
      json(res, 200, { url: authUrl });
      return;
    }

    if (pathname === "/oauth/google/callback" && req.method === "GET") {
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
        redirectUri: `${base}/oauth/google/callback`,
      });
      if (result.ok) {
        res.writeHead(302, { Location: "/?oauth=ok" });
      } else {
        res.writeHead(302, { Location: `/?oauth=err&msg=${encodeURIComponent(result.error)}` });
      }
      res.end();
      return;
    }

    if (pathname === "/api/test/wordpress" && req.method === "GET") {
      const { testWordPress } = await import("../connections/test.ts");
      json(res, 200, await testWordPress());
      return;
    }

    if (pathname === "/api/test/blogger" && req.method === "GET") {
      const { testBlogger } = await import("../connections/test.ts");
      json(res, 200, await testBlogger());
      return;
    }

    if (pathname === "/api/generate-all" && req.method === "POST") {
      const job = await startGenerateJob();
      json(res, 200, job);
      return;
    }

    if (pathname.startsWith("/data/")) {
      try {
        const filePath = path.join(process.cwd(), pathname.slice(1));
        const content = await readFile(filePath, "utf8");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
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

  await new Promise<void>((resolve) => {
    server.listen(PORT, HOST, () => resolve());
  });

  const urls = getDashboardUrls(PORT);
  console.log(`\n📱 Content Autopilot`);
  console.log(`   PIN:  ${pin}  ← 폰에서 로그인할 때 입력`);
  console.log(`   PC:   ${urls.local}`);
  for (const lan of urls.lan) {
    console.log(`   WiFi: ${lan}`);
  }

  if (opts?.public) {
    log("info", "공개 터널 여는 중… (모바일 데이터용)");
    try {
      const tunnel = await startPublicTunnel(PORT);
      publicUrl = tunnel.url;
      writeEnvConfig({ PUBLIC_URL: tunnel.url });
      console.log(`\n🌐 밖에서도 (데이터 OK):\n   ${tunnel.url}`);
      console.log(`   → 폰 브라우저로 열고 PIN ${pin} 입력\n`);
    } catch (e) {
      log("error", "공개 터널 실패 — WiFi 주소만 사용하세요", e);
    }
  } else {
    console.log(`\n   밖에서도 쓰려면: npm run phone:public\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pub = process.argv.includes("--public");
  startDashboard({ public: pub });
}
