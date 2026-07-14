import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "./auth-token";
import { findUserById } from "./users-db";

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return resolveSessionFromToken(token);
}

/** Shared session resolution for API routes and middleware (when DB is available). */
export async function resolveSessionFromToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await findUserById(session.sub);
  if (!user) return null;
  if ((session.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
    return null;
  }
  return {
    ...session,
    email: user.email,
    shopName: user.shopName,
  };
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return resolveSessionFromToken(token);
}
