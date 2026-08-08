import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./load.ts";

const ENV_PATH = join(ROOT, ".env");

export type EnvConfig = {
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
  MOCK_LLM?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NTFY_TOPIC?: string;
  NOTIFY_WEBHOOK_URL?: string;
  PUBLISH_MODE?: string;
  DASHBOARD_PIN?: string;
  DASHBOARD_PORT?: string;
  DASHBOARD_HOST?: string;
  PUBLIC_URL?: string;
};

export function readEnvConfig(): EnvConfig {
  const out: EnvConfig = {};
  if (!existsSync(ENV_PATH)) return out;
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim() as keyof EnvConfig;
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

export function applyEnvConfig(cfg: EnvConfig): void {
  for (const [k, v] of Object.entries(cfg)) {
    if (v !== undefined && v !== "") process.env[k] = v;
  }
}

export function writeEnvConfig(updates: Record<string, string>): void {
  const lines: string[] = [];
  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").split("\n") : [];
  const map = new Map<string, string>();

  for (const line of existing) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }

  for (const [k, v] of Object.entries(updates)) {
    if (v === "") map.delete(k);
    else map.set(k, v);
  }

  if (!existsSync(ENV_PATH) && map.size === 0) {
    const example = join(ROOT, ".env.example");
    if (existsSync(example)) {
      writeFileSync(ENV_PATH, readFileSync(example, "utf8"), "utf8");
      return writeEnvConfig(updates);
    }
  }

  const ordered = [
    "LLM_API_KEY",
    "LLM_BASE_URL",
    "LLM_MODEL",
    "MOCK_LLM",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "WP_BASE_URL",
    "WP_USERNAME",
    "WP_APP_PASSWORD",
    "BLOGGER_BLOG_ID",
    "BLOGGER_ACCESS_TOKEN",
    "NAVER_BLOG_ID",
    "PUBLISH_MODE",
    "POSTS_PER_BRAND",
    "OUTPUT_DIR",
    "NOTIFY_WEBHOOK_URL",
    "NTFY_TOPIC",
    "DASHBOARD_PIN",
    "DASHBOARD_PORT",
    "DASHBOARD_HOST",
    "PUBLIC_URL",
  ];

  for (const key of ordered) {
    if (map.has(key)) lines.push(`${key}=${map.get(key)}`);
  }
  for (const [key, val] of map) {
    if (!ordered.includes(key)) lines.push(`${key}=${val}`);
  }

  writeFileSync(ENV_PATH, `${lines.join("\n")}\n`, "utf8");
}

export function maskSecret(value?: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
