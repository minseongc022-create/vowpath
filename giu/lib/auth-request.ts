import { cookies } from "next/headers";
import { getMerchantByAccountId } from "./store";
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

/** Resolve merchant id from DB (authoritative) with JWT fallback. */
export async function resolveMerchantId(session: GiuSessionPayload): Promise<string | null> {
  if (session.role !== "merchant") return null;
  const fromDb = (await getMerchantByAccountId(session.sub))?.id;
  return fromDb ?? session.merchantId ?? null;
}

export async function requireMerchantSession(
  request: Request,
  expectedMerchantId?: string,
): Promise<{ session: GiuSessionPayload; merchantId: string } | null> {
  const session = await getGiuSessionFromRequest(request);
  if (!session || session.role !== "merchant") return null;
  const merchantId = await resolveMerchantId(session);
  if (!merchantId) return null;
  if (expectedMerchantId && merchantId !== expectedMerchantId) return null;
  return { session, merchantId };
}

export async function merchantOwnsReservation(
  session: GiuSessionPayload,
  reservationMerchantId: string,
): Promise<boolean> {
  const merchantId = await resolveMerchantId(session);
  return Boolean(merchantId && merchantId === reservationMerchantId);
}
