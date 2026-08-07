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

const PORT = Number(process.env.DASHBOARD_PORT ?? 3847);
const HOST = process.env.DASHBOARD_HOST ?? "0.0.0.0";

function requestBase(req: IncomingMessage): string {
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

export function startDashboard(): void {
  loadEnvFile();

  const server = createServer(async (req, res) => {
    const base = requestBase(req);
    const url = new URL(req.url ?? "/", base);

    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getMobileHtml());
      return;
    }

    if (url.pathname === "/manifest.json") {
      json(res, 200, MANIFEST);
      return;
    }

    if (url.pathname === "/sw.js") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(SERVICE_WORKER);
      return;
    }

    if (url.pathname === "/icon-192.svg") {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end(ICON_192);
      return;
    }

    if (url.pathname === "/icon-512.svg") {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end(ICON_512);
      return;
    }

    if (url.pathname === "/api/network" && req.method === "GET") {
      const urls = getDashboardUrls(PORT);
      json(res, 200, { local: urls.local, lan: urls.lan, port: PORT });
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
      const redirectUri = `${base}/oauth/google/callback`;
      const authUrl = buildGoogleAuthUrl(
        env.GOOGLE_CLIENT_ID,
        redirectUri,
        url.searchParams.get("blogId") || undefined,
      );
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

  server.listen(PORT, HOST, () => {
    const urls = getDashboardUrls(PORT);
    console.log(`\n📱 Content Autopilot (폰 최적화)`);
    console.log(`   PC:  ${urls.local}`);
    for (const lan of urls.lan) {
      console.log(`   폰:  ${lan}  ← 같은 Wi‑Fi에서 접속`);
    }
    console.log(`   → 홈 화면에 추가하면 앱처럼 사용\n`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startDashboard();
}
