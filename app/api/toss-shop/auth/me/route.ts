import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccount, getDashboardStats, getMerchant, merchantApiStatus } from "@/toss-shop/lib/store";
import { isTossShopEntitled } from "@/toss-shop/lib/billing";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [merchant, stats, account] = await Promise.all([
    getMerchant(session.merchantId),
    getDashboardStats(session.merchantId),
    getAccount(session.sub),
  ]);

  const api = merchant ? merchantApiStatus(merchant) : null;

  return NextResponse.json({
    user: { email: session.email, name: session.name, merchantId: session.merchantId },
    merchant,
    stats,
    api,
    entitled: account ? isTossShopEntitled(account) : true,
  });
}
