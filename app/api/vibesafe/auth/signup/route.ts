import { NextResponse } from "next/server";
import { z } from "zod";
import { signUp } from "@/vibesafe/lib/auth";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { DB_REQUIRED_MESSAGE, enforceRateLimit, fail, ok, readJson } from "@/vibesafe/lib/http";
import { createSessionToken, sessionCookieOptions, VIBESAFE_SESSION_COOKIE } from "@/vibesafe/lib/session";

const schema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
  name: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return fail(DB_REQUIRED_MESSAGE, 503);

  const limited = await enforceRateLimit({ request, scope: "signup", limit: 5, windowSeconds: 600 });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  const result = await signUp(parsed.data);
  if (!result.ok) return fail(result.error);

  await recordEvent({ name: "signup_completed", userId: result.user.id });

  const token = await createSessionToken({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
  });
  const response = NextResponse.json({ ok: true, redirect: "/vibesafe/projects/new" });
  response.cookies.set(VIBESAFE_SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export const dynamic = "force-dynamic";
