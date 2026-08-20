/**
 * Node-only half of the Pricepulse dashboard auth: password check (uses
 * node:crypto, not Edge-safe) and cookie read/write (Server Actions, Route
 * Handlers). The actual gate — deciding who gets in — lives in middleware.ts,
 * matching how the rest of this app gates /dashboard, /onboarding, /settings.
 * This is a solo-founder internal tool, so one shared password is enough;
 * a full NextAuth/Prisma account system would be scope creep.
 */
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import {
  createPricepulseSessionToken,
  PRICEPULSE_SESSION_COOKIE,
  PRICEPULSE_SESSION_MAX_AGE_SECONDS,
  verifyPricepulseSessionToken,
} from "./session.ts";

export { PRICEPULSE_SESSION_COOKIE };

export function isPasswordConfigured(): boolean {
  return Boolean(process.env.PRICEPULSE_DASHBOARD_PASSWORD?.trim());
}

/** Constant-time compare — this gate gets hit from a public URL. */
export function checkPassword(input: string): boolean {
  const expected = process.env.PRICEPULSE_DASHBOARD_PASSWORD?.trim();
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(PRICEPULSE_SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyPricepulseSessionToken(token);
}

export async function setSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(PRICEPULSE_SESSION_COOKIE, await createPricepulseSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/pricepulse",
    maxAge: PRICEPULSE_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(PRICEPULSE_SESSION_COOKIE, "", { path: "/pricepulse", maxAge: 0 });
}
