import { randomBytes } from "node:crypto";
import { saveConnection } from "../connections/store.ts";

const SCOPES = [
  "https://www.googleapis.com/auth/blogger",
  "openid",
  "email",
].join(" ");

const pendingStates = new Map<string, { blogId?: string; at: number }>();

export function buildGoogleAuthUrl(clientId: string, redirectUri: string, blogId?: string): string {
  const state = randomBytes(16).toString("hex");
  pendingStates.set(state, { blogId, at: Date.now() });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCallback(args: {
  code: string;
  state: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ ok: true; blogName?: string } | { ok: false; error: string }> {
  const pending = pendingStates.get(args.state);
  pendingStates.delete(args.state);
  if (!pending) return { ok: false, error: "invalid state" };

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: args.code,
      client_id: args.clientId,
      client_secret: args.clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return { ok: false, error: `token error ${tokenRes.status}` };
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return { ok: false, error: "no access_token" };

  let blogId = pending.blogId;
  let blogName: string | undefined;

  if (!blogId) {
    const blogsRes = await fetch("https://www.googleapis.com/blogger/v3/users/self/blogs", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (blogsRes.ok) {
      const blogs = (await blogsRes.json()) as { items?: Array<{ id?: string; name?: string }> };
      blogId = blogs.items?.[0]?.id;
      blogName = blogs.items?.[0]?.name;
    }
  }

  if (!blogId) {
    return { ok: false, error: "Blog ID를 찾지 못했습니다. Blogger에서 블로그를 먼저 만드세요." };
  }

  await saveConnection("blogger", {
    blogId,
    accessToken: tokenData.access_token,
  });

  return { ok: true, blogName };
}
