import { NextResponse } from "next/server";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { getMerchantByAccountId } from "@/giu/lib/store";

export async function GET(request: Request) {
  const session = await getGiuSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ account: null });
  }
  const merchant =
    session.role === "merchant"
      ? await getMerchantByAccountId(session.sub)
      : null;
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
