import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "./auth-token";
import { findUserById } from "./users-db";

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
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
