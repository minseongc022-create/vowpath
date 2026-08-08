import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../config/load.ts";
import { readEnvConfig, writeEnvConfig } from "../config/env-store.ts";

const SESSION_COOKIE = "autopilot_session";
const sessions = new Set<string>();

export function ensureDashboardPin(): string {
  const env = readEnvConfig();
  if (env.DASHBOARD_PIN && env.DASHBOARD_PIN.length >= 4) return env.DASHBOARD_PIN;

  const pinPath = join(ROOT, "data", "dashboard-pin.txt");
  mkdirSync(join(ROOT, "data"), { recursive: true });
  if (existsSync(pinPath)) {
    const pin = readFileSync(pinPath, "utf8").trim();
    if (pin) {
      writeEnvConfig({ DASHBOARD_PIN: pin });
      return pin;
    }
  }

  const pin = String(100000 + Math.floor(Math.random() * 900000));
  writeFileSync(pinPath, `${pin}\n`, "utf8");
  writeEnvConfig({ DASHBOARD_PIN: pin });
  return pin;
}

export function getDashboardPin(): string {
  return readEnvConfig().DASHBOARD_PIN || ensureDashboardPin();
}

export function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = rest.join("=");
  }
  return out;
}

export function isAuthed(cookieHeader?: string): boolean {
  const pin = getDashboardPin();
  // Localhost without pin enforcement only when DASHBOARD_PIN empty — we always have pin for public
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  return Boolean(token && sessions.has(token));
}

export function createSession(): { token: string; setCookie: string } {
  const token = randomBytes(24).toString("hex");
  sessions.add(token);
  return {
    token,
    setCookie: `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
  };
}

export function verifyPin(pin: string): boolean {
  return pin.trim() === getDashboardPin();
}

export function loginPageHtml(error?: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <meta name="theme-color" content="#1d9bf0"/>
  <title>Autopilot 로그인</title>
  <style>
    body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0f1419;color:#e7e9ea;font-family:-apple-system,system-ui,sans-serif;padding:24px}
    .box{width:100%;max-width:360px;background:#15202b;border:1px solid #38444d;border-radius:16px;padding:24px}
    h1{font-size:1.2rem;margin:0 0 8px}p{color:#71767b;font-size:.85rem;margin:0 0 16px}
    input{width:100%;padding:16px;border-radius:12px;border:1px solid #38444d;background:#0f1419;color:#fff;font-size:24px;letter-spacing:.3em;text-align:center;box-sizing:border-box}
    button{width:100%;margin-top:12px;padding:16px;border:none;border-radius:14px;background:#1d9bf0;color:#fff;font-weight:700;font-size:1rem}
    .err{color:#f4212e;font-size:.85rem;margin-top:8px}
  </style>
</head>
<body>
  <form class="box" method="POST" action="/login">
    <h1>Content Autopilot</h1>
    <p>공개 접속용 PIN을 입력하세요 (PC 터미널에 표시됨)</p>
    <input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••••" autofocus required/>
    <button type="submit">들어가기</button>
    ${error ? `<p class="err">${error}</p>` : ""}
  </form>
</body>
</html>`;
}
