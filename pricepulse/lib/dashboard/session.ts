/**
 * Edge-safe half of the Pricepulse dashboard session. Import this (never
 * auth.ts) from middleware.ts — middleware runs on the Edge runtime and
 * cannot pull in node:crypto, which auth.ts uses for the password check.
 */
import { SignJWT, jwtVerify } from "jose";

export const PRICEPULSE_SESSION_COOKIE = "pricepulse_session";
export const PRICEPULSE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getPricepulseSecret(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const secret = (env.PRICEPULSE_DASHBOARD_SECRET || env.AUTH_SECRET)?.trim();
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret);
  if (env.NODE_ENV === "production") {
    throw new Error("PRICEPULSE_DASHBOARD_SECRET (or AUTH_SECRET) must be set in production");
  }
  return new TextEncoder().encode("dev-only-change-pricepulse-dashboard-secret");
}

export async function createPricepulseSessionToken(): Promise<string> {
  return new SignJWT({ scope: "pricepulse-dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("pricepulse")
    .setIssuedAt()
    .setExpirationTime(`${PRICEPULSE_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getPricepulseSecret());
}

export async function verifyPricepulseSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getPricepulseSecret());
    return payload.sub === "pricepulse" && payload.scope === "pricepulse-dashboard";
  } catch {
    return false;
  }
}
