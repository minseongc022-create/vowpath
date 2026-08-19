import { NextResponse } from "next/server";
import {
  createGiuSessionToken,
  giuSessionCookieOptions,
} from "@/giu/lib/auth";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { getMerchant, getMerchantByAccountId } from "@/giu/lib/store";

export async function GET(request: Request) {
  const session = await getGiuSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ account: null });
  }
  let merchant = null;
  if (session.role === "merchant") {
    merchant =
      (await getMerchantByAccountId(session.sub)) ??
      (session.merchantId ? await getMerchant(session.merchantId) : null);
  }

  const account = {
    id: session.sub,
    email: session.email,
    name: session.name,
    phone: session.phone,
    role: session.role,
    market: merchant?.market ?? "kr",
  };

  const needsTokenRefresh =
    session.role === "merchant" && merchant && session.merchantId !== merchant.id;

  if (needsTokenRefresh && merchant) {
    const token = await createGiuSessionToken({
      sub: session.sub,
      role: session.role,
      email: session.email,
      phone: session.phone,
      name: session.name,
      merchantId: merchant.id,
      market: merchant.market ?? session.market,
    });
    const response = NextResponse.json({ account, merchant });
    response.cookies.set(giuSessionCookieOptions(token));
    return response;
  }

  return NextResponse.json({ account, merchant });
}
