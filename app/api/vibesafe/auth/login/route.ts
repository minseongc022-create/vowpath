import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, signIn } from "@/vibesafe/lib/auth";
import { recordReturnVisit } from "@/vibesafe/lib/analytics";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { DB_REQUIRED_MESSAGE, enforceRateLimit, fail, readJson } from "@/vibesafe/lib/http";
import { createSessionToken, sessionCookieOptions, VIBESAFE_SESSION_COOKIE } from "@/vibesafe/lib/session";

const schema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return fail(DB_REQUIRED_MESSAGE, 503);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  // 이메일까지 키에 넣는다 — IP 하나로 여러 계정을 돌려 두드리는 것도,
  // 한 계정을 여러 IP에서 두드리는 것도 각각 잡히게.
  const email = normalizeEmail(parsed.data.email);
  const byIp = await enforceRateLimit({ request, scope: "login-ip", limit: 20, windowSeconds: 600 });
  if (byIp) return byIp;
  const byAccount = await enforceRateLimit({
    request,
    scope: "login-account",
    limit: 8,
    windowSeconds: 600,
    identity: email,
  });
  if (byAccount) return byAccount;

  const result = await signIn(parsed.data);
  if (!result.ok) return fail(result.error, 401);

  await recordReturnVisit(result.user.id);

  const token = await createSessionToken({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
  });
  const response = NextResponse.json({ ok: true, redirect: "/vibesafe/dashboard" });
  response.cookies.set(VIBESAFE_SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export const dynamic = "force-dynamic";
