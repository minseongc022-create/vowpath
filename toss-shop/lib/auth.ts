import { SignJWT, jwtVerify } from "jose";

export const TOSS_SHOP_SESSION_COOKIE = "toss_shop_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type TossShopSessionPayload = {
  sub: string;
  email: string;
  name: string;
  merchantId: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-change-auth-secret-32chars");
  }
  return new TextEncoder().encode(secret);
}

export async function createTossShopSessionToken(payload: TossShopSessionPayload) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    merchantId: payload.merchantId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyTossShopSessionToken(
  token: string,
): Promise<TossShopSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      merchantId: typeof payload.merchantId === "string" ? payload.merchantId : "",
    };
  } catch {
    return null;
  }
}

export function tossShopSessionCookieOptions(token: string) {
  return {
    name: TOSS_SHOP_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearTossShopSessionCookieOptions() {
  return {
    name: TOSS_SHOP_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
