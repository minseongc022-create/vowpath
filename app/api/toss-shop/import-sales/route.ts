import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { getImportPicksForMerchant, getMarketKeywords, getStoreCatalog } from "@/toss-shop/lib/store";
import { marketContext } from "@/toss-shop/lib/seller-engine/intelligence";
import { SELLER_AI_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/revenue-engine";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [picks, market, catalog] = await Promise.all([
    getImportPicksForMerchant(session.merchantId),
    getMarketKeywords(),
    getStoreCatalog(),
  ]);
  const ctx = marketContext(catalog, market.marketKeywords);

  return NextResponse.json({
    picks,
    mode: "import",
    description: "Jarvis 수입 — 카탈로그·1688·일본 · 90% 인증 · 랜딩·마진",
    engineVersion: SELLER_AI_ENGINE_VERSION,
    catalogSize: ctx.catalogSize,
    marketKeywordCount: ctx.marketKeywordCount,
    dataQuality: ctx.dataQuality,
  });
}
