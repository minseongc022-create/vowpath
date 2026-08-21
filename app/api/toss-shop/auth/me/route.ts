import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getPlanAccess, FREE_DAILY_KEYWORD_LIMIT, PRO_PRICE_KRW } from "@/toss-shop/lib/billing";
import { getAccount, getDashboardStats, getKeywordUsageToday, getMerchant, merchantApiStatus, syncOwnerPlanIfNeeded } from "@/toss-shop/lib/store";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncOwnerPlanIfNeeded(session.sub);

  const [merchant, stats, account] = await Promise.all([
    getMerchant(session.merchantId),
    getDashboardStats(session.merchantId),
    getAccount(session.sub),
  ]);

  const api = merchant ? merchantApiStatus(merchant) : null;
  const access = account ? getPlanAccess(account) : null;
  const keywordUsed = access?.fullAccess ? null : await getKeywordUsageToday(session.sub);

  return NextResponse.json({
    user: { email: session.email, name: session.name, merchantId: session.merchantId },
    merchant,
    stats,
    api,
    billing: account
      ? {
          plan: account.plan,
          access,
          proExpiresAt: account.proExpiresAt,
          keywordUsage: access?.fullAccess ? null : { used: keywordUsed, limit: FREE_DAILY_KEYWORD_LIMIT },
          priceKrw: PRO_PRICE_KRW,
        }
      : null,
    entitled: access?.fullAccess ?? false,
  });
}
