import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { getConsignmentPicksForMerchant, getMarketKeywords, getStoreCatalog } from "@/toss-shop/lib/store";
import { CONSIGNMENT_DAILY_PICKS } from "@/toss-shop/lib/billing";
import { marketContext } from "@/toss-shop/lib/seller-engine/intelligence";
import { SELLER_AI_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/revenue-engine";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [picks, market, catalog] = await Promise.all([
    getConsignmentPicksForMerchant(session.merchantId),
    getMarketKeywords(),
    getStoreCatalog(),
  ]);
  const ctx = marketContext(catalog, market.marketKeywords);

  return NextResponse.json({
    picks,
    dailyLimit: CONSIGNMENT_DAILY_PICKS,
    mode: "consignment",
    description: "AI v4 위탁 소싱 — 수익 극대화 · 3가지 가격 시나리오 · 하루 5개",
    engineVersion: SELLER_AI_ENGINE_VERSION,
    catalogSize: ctx.catalogSize,
    marketKeywordCount: ctx.marketKeywordCount,
    marketCollectedAt: market.marketCollectedAt,
    dataQuality: ctx.dataQuality,
  });
}
