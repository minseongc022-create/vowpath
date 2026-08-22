/**
 * Jarvis 등록 전 미리보기 브리프 — 왜 이 상품인지, 예상 수익, 게이트 요약
 */

import type { ConsignmentPick, ImportPick, JarvisPickBrief } from "../types";
import { JARVIS_CONFIDENCE_THRESHOLD, JARVIS_MONTHLY_GOAL_KRW } from "./jarvis-engine";

export const PICK_BRIEF_VERSION = "1.0";

export function buildJarvisPickBrief(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): JarvisPickBrief {
  const confidence = pick.jarvis?.confidencePct ?? pick.confidenceScore ?? 0;
  const certified = pick.jarvis?.certified ?? confidence >= JARVIS_CONFIDENCE_THRESHOLD;

  const dailyProfit =
    ("estimatedDailyProfitKrw" in pick ? pick.estimatedDailyProfitKrw : undefined) ??
    pick.revenueForecast?.dailyProfitKrw ??
    Math.round((pick.estimatedMonthlyProfitKrw ?? 0) / 30);

  const monthlyProfit =
    pick.estimatedMonthlyProfitKrw ??
    pick.revenueForecast?.monthlyProfitKrw ??
    dailyProfit * 30;

  const optimistic =
    pick.revenueForecast?.optimisticMonthlyKrw ?? Math.round(monthlyProfit * 1.35);

  const conservative =
    pick.revenueForecast?.conservativeMonthlyKrw ?? Math.round(monthlyProfit * 0.65);

  const whyReasons: string[] = [];

  if (pick.jarvis?.brief) {
    whyReasons.push(pick.jarvis.brief);
  }
  if (pick.reason) {
    whyReasons.push(pick.reason);
  }
  if (pick.topSellerPlaybook?.brief) {
    whyReasons.push(pick.topSellerPlaybook.brief);
  }
  if (pick.goalPathNote) {
    whyReasons.push(pick.goalPathNote);
  }
  if (mode === "consignment" && "wholesaleBest" in pick && pick.wholesaleBest) {
    const w = pick.wholesaleBest;
    whyReasons.push(
      `${w.platform === "domeme" ? "도매매" : "도매꾹"} ${w.unitPriceKrw.toLocaleString()}원 · MOQ ${w.moq} · ${w.source === "live" ? "실시간 API" : "추정"}`,
    );
  }
  if (pick.catalogStrategy?.rationale) {
    whyReasons.push(pick.catalogStrategy.rationale);
  }

  const gateHighlights =
    pick.jarvis?.gates
      ?.filter((g) => g.weight >= 8)
      .slice(0, 6)
      .map((g) => ({ label: g.label, passed: g.passed, detail: g.detail })) ?? [];

  const appliedTactics =
    pick.topSellerPlaybook?.tactics.filter((t) => t.applied).slice(0, 4).map((t) => t.title) ??
    [];

  const goalSharePct =
    pick.goalSharePct ??
    (monthlyProfit > 0 ? Math.round((monthlyProfit / JARVIS_MONTHLY_GOAL_KRW) * 1000) / 10 : 0);

  return {
    version: PICK_BRIEF_VERSION,
    headline: certified
      ? `Jarvis ${confidence}% 인증 — 등록 추천`
      : `Jarvis ${confidence}% — 검토 후 OK`,
    whyReasons: [...new Set(whyReasons)].slice(0, 6),
    appliedTactics,
    profitDailyKrw: dailyProfit,
    profitMonthlyKrw: monthlyProfit,
    profitOptimisticKrw: optimistic,
    profitConservativeKrw: conservative,
    marginPct: pick.estimatedMarginPct,
    goalSharePct,
    confidencePct: confidence,
    certified,
    jarvisBrief: pick.jarvis?.monthlyPathNote,
    gateHighlights,
    mode,
    keyword: pick.keyword,
    productName: pick.suggestedTitle ?? pick.productName,
    recommendedPriceKrw: pick.recommendedPriceKrw,
  };
}
