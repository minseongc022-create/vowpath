/**
 * 토스쇼핑 검색·광고 전략 — 적은 예산으로 1페이지 상단 노출 설계
 *
 * 토스 공식 광고 API 미연동 — Jarvis가 키워드·입찰·예산·Item Winner 회피를
 * 데이터 기반으로 설계하고 실행 체크리스트를 생성.
 */

import type { ConsignmentPick, ImportPick, JarvisAdCampaignPlan } from "../types";

export const AD_STRATEGY_VERSION = "1.0";

const DAILY_BUDGET_TIERS = {
  starter: 3_000,
  growth: 8_000,
  scale: 20_000,
} as const;

function rankTargetScore(competitionIntensity: number, marginPct: number): number {
  const base = 72;
  const compPenalty = competitionIntensity * 12;
  const marginBoost = Math.min(15, (marginPct - 15) * 0.8);
  return Math.round(Math.max(55, Math.min(95, base - compPenalty + marginBoost)));
}

export function buildAdCampaignPlan(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): JarvisAdCampaignPlan {
  const keyword = pick.keyword;
  const margin = pick.estimatedMarginPct;
  const comp = "competitionIntensity" in pick ? pick.competitionIntensity : 0.5;
  const searchVol = "searchVolume" in pick ? pick.searchVolume : 3000;

  const primaryKeywords = [
    keyword,
    ...(pick.v4?.keywordCluster?.slice(0, 2) ?? []),
    pick.suggestedTitle?.split(/\s+/).slice(0, 2).join(" ") ?? "",
  ].filter(Boolean);

  const longTail = pick.topSellerPlaybook?.tactics
    .filter((t) => t.applied && t.title.includes("롱"))
    .length
    ? [`${keyword} 추천`, `${keyword} 선물`, `${keyword} 가성비`]
    : [`${keyword} ${pick.category === "food" ? "맛집" : "추천"}`];

  const avoidCatalog = pick.catalogStrategy?.mode === "avoid_catalog";
  const budgetTier: keyof typeof DAILY_BUDGET_TIERS =
    margin >= 22 && comp < 0.45 ? "growth" : searchVol > 5000 ? "starter" : "starter";

  const dailyBudgetKrw = DAILY_BUDGET_TIERS[budgetTier];
  const estimatedCpcKrw = Math.round(80 + comp * 120 + (searchVol > 10000 ? 40 : 0));
  const estimatedClicks = Math.max(3, Math.round(dailyBudgetKrw / estimatedCpcKrw));
  const rankTarget = rankTargetScore(comp, margin);

  const tactics: string[] = [
    `핵심 키워드 "${keyword}" — 일예산 ${dailyBudgetKrw.toLocaleString()}원 (CPC ~${estimatedCpcKrw}원)`,
    `롱테일 ${longTail.slice(0, 2).join(", ")} — 경쟁↓ · 전환↑`,
  ];

  if (avoidCatalog) {
    tactics.push("Item Winner 회피 — 차별 구성 키워드로 카탈로그 분리 유지");
  } else if (pick.catalogWin?.representativeItemScore != null && pick.catalogWin.representativeItemScore >= 58) {
    tactics.push("대표아이템 선점 — 총액(상품+배송) 최저 유지 + 무료배송");
  }

  if (mode === "consignment") {
    tactics.push("위탁 — 재고 리스크↓ → 신규 SKU에 광고 70% 집중");
  }

  tactics.push("등록 48h 후 CTR·전환 확인 → 효자 키워드 예산 +30%");

  return {
    engineVersion: AD_STRATEGY_VERSION,
    keyword,
    primaryKeywords: [...new Set(primaryKeywords)].slice(0, 5),
    longTailKeywords: longTail.slice(0, 4),
    dailyBudgetKrw,
    estimatedCpcKrw,
    estimatedDailyClicks: estimatedClicks,
    rankTargetScore: rankTarget,
    pageOneGoal: rankTarget >= 70 ? "1페이지 상단 가능 (2~4주)" : "1페이지 중하단 (4~6주)",
    itemWinnerAvoidance: avoidCatalog,
    tactics,
    brief: `Jarvis 광고 설계 — ${keyword} · 일 ${dailyBudgetKrw.toLocaleString()}원 · 목표 ${rankTarget}점 · ${avoidCatalog ? "카탈로그 분리" : "대표아이템 경쟁"}`,
    autoExecuteReady: margin >= 15 && pick.jarvis?.certified === true,
  };
}
