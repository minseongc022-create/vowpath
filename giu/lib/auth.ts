import { SignJWT, jwtVerify } from "jose";
import type { GiuAccountRole, GiuMarket } from "./types";

export const GIU_SESSION_COOKIE = "giu_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type GiuSessionPayload = {
  sub: string;
  role: GiuAccountRole;
  email: string;
  phone: string;
  name: string;
  merchantId?: string;
  market: GiuMarket;
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

export async function createGiuSessionToken(payload: GiuSessionPayload) {
  return new SignJWT({
    role: payload.role,
    email: payload.email,
    phone: payload.phone,
    name: payload.name,
    merchantId: payload.merchantId,
    market: payload.market,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyGiuSessionToken(
  token: string,
): Promise<GiuSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    if (payload.role !== "customer" && payload.role !== "merchant") return null;
    return {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
      phone: typeof payload.phone === "string" ? payload.phone : "",
      name: typeof payload.name === "string" ? payload.name : "",
      merchantId:
        typeof payload.merchantId === "string" ? payload.merchantId : undefined,
      market: payload.market === "kr" ? "kr" : "vn",
    };
  } catch {
    return null;
  }
}

export function giuSessionCookieOptions(token: string) {
  return {
    name: GIU_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearGiuSessionCookieOptions() {
  return {
    name: GIU_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
