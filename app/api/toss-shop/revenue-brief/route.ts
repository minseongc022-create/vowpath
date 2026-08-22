import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  getConsignmentPicksForMerchant,
  getImportPicksForMerchant,
  getMerchant,
  getSettlements,
  getStoreCatalog,
} from "@/toss-shop/lib/store";
import { buildPortfolioBrief, SELLER_AI_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/revenue-engine";
import { buildTenMillionPlan } from "@/toss-shop/lib/seller-engine/goal-engine";
import { TOSS_POLICY_BRIEF, POLICY_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/policy-engine";
import { RISK_PLAYBOOK_VERSION } from "@/toss-shop/lib/seller-engine/risk-playbook";
import {
  assessIntegration,
  JARVIS_NAME,
  JARVIS_VERSION,
} from "@/toss-shop/lib/seller-engine/jarvis-engine";
import { isDomeggookApiConfigured } from "@/toss-shop/lib/wholesale/domeggook-api";

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

  const [consignment, importPicks, settlements, merchant, catalog] = await Promise.all([
    getConsignmentPicksForMerchant(session.merchantId),
    getImportPicksForMerchant(session.merchantId),
    getSettlements(session.merchantId).catch(() => []),
    getMerchant(session.merchantId),
    getStoreCatalog(),
  ]);

  const dataQuality =
    merchant?.dataSource === "live"
      ? "live"
      : merchant?.dataSource === "live_partial"
        ? "mixed"
        : "demo";

  const jarvisIntegration = assessIntegration({
    tossApiConfigured: Boolean(merchant?.apiAccessKey && merchant?.apiSecretKey),
    wholesaleApiConfigured: isDomeggookApiConfigured(),
    dataQuality,
    catalogSize: catalog.length,
  });

  const allPicks = [
    ...consignment.map((p) => ({
      monthlyProfitKrw: p.estimatedMonthlyProfitKrw ?? p.estimatedDailyProfitKrw * 30,
      profitScore: p.profitScore ?? p.winScore ?? 0,
      geniusScore: p.geniusScore,
      v6MasterScore: p.v6MasterScore,
      representativeItemScore: p.catalogWin?.representativeItemScore,
      keyword: p.keyword,
      mode: "consignment" as const,
      searchVolume: p.searchVolume,
      competitionIntensity: p.competitionIntensity,
      marginPct: p.estimatedMarginPct,
      category: p.category,
      jarvis: p.jarvis,
      jarvisConfidence: p.jarvis?.confidencePct,
      jarvisCertified: p.jarvis?.certified,
    })),
    ...importPicks.map((p) => ({
      monthlyProfitKrw: p.estimatedMonthlyProfitKrw ?? 0,
      profitScore: p.profitScore ?? p.winScore ?? 0,
      geniusScore: p.geniusScore,
      v6MasterScore: p.v6MasterScore,
      representativeItemScore: p.catalogWin?.representativeItemScore,
      keyword: p.keyword,
      mode: "import" as const,
      marginPct: p.estimatedMarginPct,
      category: p.category,
      jarvis: p.jarvis,
      jarvisConfidence: p.jarvis?.confidencePct,
      jarvisCertified: p.jarvis?.certified,
    })),
  ];

  const portfolio = buildPortfolioBrief(allPicks);
  const actualMonthly =
    settlements.length > 0 ? estimateActualMonthlyFromSettlements(settlements) : undefined;
  const tenMillionPlan = buildTenMillionPlan(allPicks, actualMonthly, jarvisIntegration);

  const certifiedPicks = allPicks.filter((p) => p.jarvisCertified);
  const avgJarvisConfidence =
    allPicks.length > 0
      ? Math.round(
          allPicks.reduce((s, p) => s + (p.jarvisConfidence ?? 0), 0) / allPicks.length,
        )
      : 0;

  const topPicks = [...allPicks]
    .sort((a, b) => {
      const certA = a.jarvisCertified ? 1 : 0;
      const certB = b.jarvisCertified ? 1 : 0;
      if (certA !== certB) return certB - certA;
      return (b.jarvisConfidence ?? b.v6MasterScore ?? b.geniusScore ?? b.profitScore) -
        (a.jarvisConfidence ?? a.v6MasterScore ?? a.geniusScore ?? a.profitScore);
    })
    .slice(0, 3);

  const avgRepItemScore =
    allPicks.filter((p) => p.representativeItemScore != null).length > 0
      ? Math.round(
          allPicks.reduce((s, p) => s + (p.representativeItemScore ?? 0), 0) /
            allPicks.filter((p) => p.representativeItemScore != null).length,
        )
      : 0;

  const allRiskReports = [
    ...consignment.map((p) => p.riskPlaybook ?? p.v6?.riskPlaybook),
    ...importPicks.map((p) => p.riskPlaybook ?? p.v6?.riskPlaybook),
  ].filter(Boolean);

  const policyHealth =
    allRiskReports.length > 0
      ? {
          avgSafetyScore: Math.round(
            allRiskReports.reduce((s, r) => s + (r!.overallSafetyScore ?? 0), 0) / allRiskReports.length,
          ),
          totalRisks: allRiskReports.reduce((s, r) => s + (r!.risks?.length ?? 0), 0),
          criticalCount: allRiskReports.reduce((s, r) => s + (r!.criticalCount ?? 0), 0),
          blockCount: allRiskReports.reduce((s, r) => s + (r!.blockCount ?? 0), 0),
        }
      : undefined;

  return NextResponse.json({
    engineVersion: SELLER_AI_ENGINE_VERSION,
    jarvisName: JARVIS_NAME,
    jarvisVersion: JARVIS_VERSION,
    jarvisIntegration,
    jarvisStats: {
      certifiedCount: certifiedPicks.length,
      totalPicks: allPicks.length,
      avgConfidence: avgJarvisConfidence,
      certifiedMonthlyProfitKrw: certifiedPicks.reduce((s, p) => s + p.monthlyProfitKrw, 0),
    },
    policyEngineVersion: POLICY_ENGINE_VERSION,
    riskPlaybookVersion: RISK_PLAYBOOK_VERSION,
    tossPolicyBrief: TOSS_POLICY_BRIEF,
    policySummary: {
      catalogModel: TOSS_POLICY_BRIEF.catalogModel,
      avgRepresentativeItemScore: avgRepItemScore,
      topRepItemKeyword: topPicks[0]?.keyword ?? "",
    },
    policyHealth,
    portfolio,
    tenMillionPlan,
    topPicks,
    consignmentCount: consignment.length,
    importCount: importPicks.length,
    message:
      `${JARVIS_NAME} — 90% 인증 SKU ${certifiedPicks.length}개 · 연동 ${jarvisIntegration.score}% · 월 1천만 목표 · 도매매 단품 우선`,
  });
}
