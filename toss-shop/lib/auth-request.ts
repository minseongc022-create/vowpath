import { cookies } from "next/headers";
import {
  TOSS_SHOP_SESSION_COOKIE,
  verifyTossShopSessionToken,
  type TossShopSessionPayload,
} from "./auth";

export async function getTossShopSession(): Promise<TossShopSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(TOSS_SHOP_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyTossShopSessionToken(token);
}

export async function requireTossShopSession(): Promise<TossShopSessionPayload | null> {
  return getTossShopSession();
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${TOSS_SHOP_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getTossShopSessionFromRequest(
  request: Request,
): Promise<TossShopSessionPayload | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;
  return verifyTossShopSessionToken(token);
}

export async function requireTossShopSessionFromRequest(
  request: Request,
): Promise<TossShopSessionPayload | null> {
  return getTossShopSessionFromRequest(request);
}
