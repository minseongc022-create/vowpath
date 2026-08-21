import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  getConsignmentPicksForMerchant,
  getImportPicksForMerchant,
  getSettlements,
} from "@/toss-shop/lib/store";
import { buildPortfolioBrief, SELLER_AI_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/revenue-engine";
import { buildTenMillionPlan } from "@/toss-shop/lib/seller-engine/goal-engine";

function estimateActualMonthlyFromSettlements(
  rows: { grossKrw: number; orderDate: string }[],
): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const thisMonth = rows.filter((r) => {
    const d = new Date(r.orderDate);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const gross = thisMonth.reduce((s, r) => s + r.grossKrw, 0);
  return Math.round(gross * 0.12);
}

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [consignment, importPicks, settlements] = await Promise.all([
    getConsignmentPicksForMerchant(session.merchantId),
    getImportPicksForMerchant(session.merchantId),
    getSettlements(session.merchantId).catch(() => []),
  ]);

  const allPicks = [
    ...consignment.map((p) => ({
      monthlyProfitKrw: p.estimatedMonthlyProfitKrw ?? p.estimatedDailyProfitKrw * 30,
      profitScore: p.profitScore ?? p.winScore ?? 0,
      geniusScore: p.geniusScore,
      keyword: p.keyword,
      mode: "consignment" as const,
      searchVolume: p.searchVolume,
      competitionIntensity: p.competitionIntensity,
      marginPct: p.estimatedMarginPct,
      category: p.category,
    })),
    ...importPicks.map((p) => ({
      monthlyProfitKrw: p.estimatedMonthlyProfitKrw ?? 0,
      profitScore: p.profitScore ?? p.winScore ?? 0,
      geniusScore: p.geniusScore,
      keyword: p.keyword,
      mode: "import" as const,
      marginPct: p.estimatedMarginPct,
      category: p.category,
    })),
  ];

  const portfolio = buildPortfolioBrief(allPicks);
  const actualMonthly =
    settlements.length > 0 ? estimateActualMonthlyFromSettlements(settlements) : undefined;
  const tenMillionPlan = buildTenMillionPlan(allPicks, actualMonthly);

  const topPicks = [...allPicks]
    .sort((a, b) => (b.geniusScore ?? b.profitScore) - (a.geniusScore ?? a.profitScore))
    .slice(0, 3);

  return NextResponse.json({
    engineVersion: SELLER_AI_ENGINE_VERSION,
    portfolio,
    tenMillionPlan,
    topPicks,
    consignmentCount: consignment.length,
    importCount: importPicks.length,
    message: "AI v5 — 월 1,000만 원 목표 · 도매·해외 소싱 · genius 점수",
  });
}
