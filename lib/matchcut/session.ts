import { cookies } from "next/headers";
import {
  MATCHCUT_SESSION_COOKIE,
  verifyMatchCutSessionToken,
  type MatchCutSessionPayload,
} from "./auth-token";
import { findMatchCutUserById } from "./users-db";

export async function getMatchCutSession(): Promise<MatchCutSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(MATCHCUT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyMatchCutSessionToken(token);
  if (!payload) return null;
  const user = await findMatchCutUserById(payload.sub);
  if (!user) return null;
  if ((user.sessionVersion ?? 0) !== (payload.sessionVersion ?? 0)) return null;
  return payload;
}

export async function requireMatchCutSession(): Promise<MatchCutSessionPayload> {
  const session = await getMatchCutSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
