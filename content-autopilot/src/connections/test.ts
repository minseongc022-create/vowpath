import { loadConnections } from "./store.ts";

export type ConnectionTestResult = {
  platform: string;
  ok: boolean;
  detail: string;
};

export async function testWordPress(): Promise<ConnectionTestResult> {
  const c = loadConnections().wordpress;
  const base = c?.baseUrl?.replace(/\/$/, "");
  const user = c?.username;
  const pass = c?.appPassword;
  if (!base || !user || !pass) {
    return { platform: "wordpress", ok: false, detail: "WordPress 정보 미입력" };
  }
  try {
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      return { platform: "wordpress", ok: false, detail: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { name?: string };
    return { platform: "wordpress", ok: true, detail: `연결됨: ${data.name || user}` };
  } catch (e) {
    return { platform: "wordpress", ok: false, detail: String(e) };
  }
}

export async function testBlogger(): Promise<ConnectionTestResult> {
  const c = loadConnections().blogger;
  const blogId = c?.blogId;
  const token = c?.accessToken;
  if (!blogId || !token) {
    return { platform: "blogger", ok: false, detail: "Blogger 정보 미입력" };
  }
  try {
    const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { platform: "blogger", ok: false, detail: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { name?: string; url?: string };
    return { platform: "blogger", ok: true, detail: `연결됨: ${data.name || blogId}` };
  } catch (e) {
    return { platform: "blogger", ok: false, detail: String(e) };
  }
}

export async function testNaver(): Promise<ConnectionTestResult> {
  const c = loadConnections().naver;
  if (!c?.blogId) {
    return { platform: "naver", ok: false, detail: "네이버 ID 미입력" };
  }
  return {
    platform: "naver",
    ok: true,
    detail: `HTML 내보내기 준비됨 → blog.naver.com/${c.blogId}`,
  };
}

export async function testAllConnections(): Promise<ConnectionTestResult[]> {
  return Promise.all([testWordPress(), testBlogger(), testNaver()]);
}
