/**
 * Edge-safe half of the Pricepulse seller session. Import this (never
 * auth.ts) from middleware.ts — middleware runs on the Edge runtime and
 * cannot pull in node:crypto/bcrypt, which auth.ts uses for password hashing.
 */
import { SignJWT, jwtVerify } from "jose";

export const PRICEPULSE_SESSION_COOKIE = "pricepulse_seller_session";
export const PRICEPULSE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type PricepulseSessionPayload = {
  sellerId: string;
  email: string;
};

export function getPricepulseSecret(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const secret = (env.PRICEPULSE_DASHBOARD_SECRET || env.AUTH_SECRET)?.trim();
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret);
  if (env.NODE_ENV === "production") {
    throw new Error("PRICEPULSE_DASHBOARD_SECRET (or AUTH_SECRET) must be set in production");
  }
  return new TextEncoder().encode("dev-only-change-pricepulse-dashboard-secret");
}

export async function createPricepulseSessionToken(seller: PricepulseSessionPayload): Promise<string> {
  return new SignJWT({ scope: "pricepulse-seller", email: seller.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(seller.sellerId)
    .setIssuedAt()
    .setExpirationTime(`${PRICEPULSE_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getPricepulseSecret());
}

/** Returns the session payload when valid, or null — callers get the seller id, not just a boolean. */
export async function verifyPricepulseSessionToken(token: string): Promise<PricepulseSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getPricepulseSecret());
    if (payload.scope !== "pricepulse-seller" || typeof payload.sub !== "string") return null;
    return { sellerId: payload.sub, email: typeof payload.email === "string" ? payload.email : "" };
  } catch {
    return null;
  }
}
