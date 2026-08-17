import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SEC = 60;

function secret(): string {
  const env = process.env.GIU_PICKUP_QR_SECRET?.trim();
  if (env) return env;
  const auth = process.env.AUTH_SECRET?.trim();
  if (auth) return `giu-pickup:${auth}`;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("GIU_PICKUP_QR_SECRET or AUTH_SECRET is required in production");
  }
  return "giu-dev-pickup-qr-secret-change-me";
}

/** Unix seconds — token rotates every 60s on aligned windows. */
export function pickupQrExpiresAt(nowSec = Math.floor(Date.now() / 1000)): number {
  return Math.floor(nowSec / TOKEN_TTL_SEC) * TOKEN_TTL_SEC + TOKEN_TTL_SEC;
}

function signPayload(reservationId: string, exp: number): string {
  return createHmac("sha256", secret())
    .update(`${reservationId}:${exp}`)
    .digest("base64url")
    .slice(0, 16);
}

export function createPickupQrToken(
  reservationId: string,
  nowSec = Math.floor(Date.now() / 1000),
): { token: string; expiresAt: number } {
  const exp = pickupQrExpiresAt(nowSec);
  const sig = signPayload(reservationId, exp);
  return {
    token: `GIU2:${reservationId}:${exp}:${sig}`,
    expiresAt: exp * 1000,
  };
}

export function verifyPickupQrToken(
  token: string,
): { reservationId: string; expiresAt: number } | null {
  const trimmed = token.trim();
  const match = trimmed.match(/^GIU2:([^:]+):(\d+):([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  const [, reservationId, expStr, sig] = match;
  const exp = Number(expStr);
  if (!reservationId || !Number.isFinite(exp)) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > exp) return null;
  const expected = signPayload(reservationId, exp);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { reservationId, expiresAt: exp * 1000 };
}

export function isPickupQrToken(raw: string): boolean {
  return raw.trim().startsWith("GIU2:");
}
