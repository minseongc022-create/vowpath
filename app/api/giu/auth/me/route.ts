import { NextResponse } from "next/server";
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
  return NextResponse.json({
    account: {
      id: session.sub,
      email: session.email,
      name: session.name,
      phone: session.phone,
      role: session.role,
      market: session.market,
    },
    merchant,
  });
}
