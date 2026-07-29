import { SignJWT, jwtVerify } from "jose";

export const MATCHCUT_SESSION_COOKIE = "matchcut_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type MatchCutSessionPayload = {
  sub: string;
  email: string;
  displayName: string;
  sessionVersion?: number;
};

function getSecret() {
  const secret = process.env.MATCHCUT_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MATCHCUT_AUTH_SECRET or AUTH_SECRET must be set");
    }
    return new TextEncoder().encode("dev-matchcut-auth-secret-32chars");
  }
  return new TextEncoder().encode(secret);
}

export async function createMatchCutSessionToken(payload: MatchCutSessionPayload) {
  return new SignJWT({
    email: payload.email,
    displayName: payload.displayName,
    sessionVersion: payload.sessionVersion ?? 0,
    product: "matchcut",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyMatchCutSessionToken(
  token: string,
): Promise<MatchCutSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.product !== "matchcut") return null;
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      displayName:
        typeof payload.displayName === "string" ? payload.displayName : "셀러",
      sessionVersion:
        typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  } catch {
    return null;
  }
}

export function matchCutSessionCookieOptions(token: string) {
  return {
    name: MATCHCUT_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearMatchCutSessionCookieOptions() {
  return {
    name: MATCHCUT_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
