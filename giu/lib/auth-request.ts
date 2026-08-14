import { cookies } from "next/headers";
import { verifyGiuSessionToken, GIU_SESSION_COOKIE, type GiuSessionPayload } from "./auth";

export async function getGiuSession(): Promise<GiuSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(GIU_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyGiuSessionToken(token);
}

export async function requireGiuSession(
  role?: "customer" | "merchant",
): Promise<GiuSessionPayload | null> {
  const session = await getGiuSession();
  if (!session) return null;
  if (role && session.role !== role) return null;
  return session;
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${GIU_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getGiuSessionFromRequest(
  request: Request,
): Promise<GiuSessionPayload | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;
  return verifyGiuSessionToken(token);
}
