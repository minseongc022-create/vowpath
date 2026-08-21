import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  getConsignmentPicksForMerchant,
  getImportPicksForMerchant,
} from "@/toss-shop/lib/store";
import { buildPortfolioBrief, SELLER_AI_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/revenue-engine";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [consignment, importPicks] = await Promise.all([
    getConsignmentPicksForMerchant(session.merchantId),
    getImportPicksForMerchant(session.merchantId),
  ]);

  const allPicks = [
    ...consignment.map((p) => ({
      monthlyProfitKrw: p.estimatedMonthlyProfitKrw ?? p.estimatedDailyProfitKrw * 30,
      profitScore: p.profitScore ?? p.winScore ?? 0,
      keyword: p.keyword,
      mode: "consignment" as const,
    })),
    ...importPicks.map((p) => ({
      monthlyProfitKrw: p.estimatedMonthlyProfitKrw ?? 0,
      profitScore: p.profitScore ?? p.winScore ?? 0,
      keyword: p.keyword,
      mode: "import" as const,
    })),
  ];

  const portfolio = buildPortfolioBrief(allPicks);
  const topPicks = [...allPicks]
    .sort((a, b) => b.monthlyProfitKrw - a.monthlyProfitKrw)
    .slice(0, 3);

  return NextResponse.json({
    engineVersion: SELLER_AI_ENGINE_VERSION,
    portfolio,
    topPicks,
    consignmentCount: consignment.length,
    importCount: importPicks.length,
    message: "AI v5 — 도매꾹·1688·라쿠텐 연동 · 예상 월수익 포트폴리오",
  });
}
