import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PlatformConnectionSchema, type PlatformConnections } from "../config/types.ts";
import { ROOT } from "../config/load.ts";

const CONNECTIONS_PATH = join(ROOT, "data", "connections.json");

export type PlatformId = "wordpress" | "blogger" | "naver";

export function loadConnections(): PlatformConnections {
  try {
    const raw = JSON.parse(readFileSync(CONNECTIONS_PATH, "utf8"));
    return PlatformConnectionSchema.parse(raw);
  } catch {
    return {};
  }
}

export async function getConnections(): Promise<PlatformConnections> {
  return loadConnections();
}

export function saveConnections(data: PlatformConnections): void {
  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(CONNECTIONS_PATH, JSON.stringify(PlatformConnectionSchema.parse(data), null, 2), "utf8");
}

export async function saveConnection(platform: PlatformId, data: Record<string, string>): Promise<void> {
  const current = loadConnections();
  const now = new Date().toISOString();

  if (platform === "wordpress") {
    current.wordpress = {
      baseUrl: data.siteUrl?.replace(/\/$/, "") || data.baseUrl?.replace(/\/$/, ""),
      username: data.username,
      appPassword: data.appPassword,
      connectedAt: now,
    };
  } else if (platform === "blogger") {
    current.blogger = {
      blogId: data.blogId,
      accessToken: data.accessToken,
      connectedAt: now,
    };
  } else if (platform === "naver") {
    const id = data.naverId || data.blogId || "";
    current.naver = {
      blogId: id,
      blogUrl: id ? `https://blog.naver.com/${id}` : undefined,
      note: "HTML export — 네이버 글쓰기에 붙여넣기",
      connectedAt: now,
    };
  }

  saveConnections(current);
}

/** Apply saved connections into process.env for publishers. */
export function applyConnectionsToEnv(): PlatformConnections {
  const c = loadConnections();
  if (c.wordpress?.baseUrl) process.env.WP_BASE_URL = c.wordpress.baseUrl;
  if (c.wordpress?.username) process.env.WP_USERNAME = c.wordpress.username;
  if (c.wordpress?.appPassword) process.env.WP_APP_PASSWORD = c.wordpress.appPassword;
  if (c.blogger?.blogId) process.env.BLOGGER_BLOG_ID = c.blogger.blogId;
  if (c.blogger?.accessToken) process.env.BLOGGER_ACCESS_TOKEN = c.blogger.accessToken;
  if (c.naver?.blogUrl) process.env.NAVER_BLOG_URL = c.naver.blogUrl;
  if (c.naver?.blogId) process.env.NAVER_BLOG_ID = c.naver.blogId;
  return c;
}

export function connectionSummary(c: PlatformConnections): string {
  const parts: string[] = [];
  parts.push(c.wordpress?.baseUrl ? `WordPress ✓` : `WordPress ✗`);
  parts.push(c.blogger?.accessToken ? `Blogger ✓` : `Blogger ✗`);
  parts.push(c.naver?.blogId ? `Naver ✓ (export)` : `Naver ✗`);
  return parts.join(" | ");
}
