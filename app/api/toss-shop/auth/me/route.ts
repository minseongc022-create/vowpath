import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getDashboardStats, getMerchant } from "@/toss-shop/lib/store";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [merchant, stats] = await Promise.all([
    getMerchant(session.merchantId),
    getDashboardStats(session.merchantId),
  ]);

  return NextResponse.json({
    user: { email: session.email, name: session.name, merchantId: session.merchantId },
    merchant,
    stats,
  });
}
