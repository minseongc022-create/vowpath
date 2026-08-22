/**
 * Jarvis Goal Engine — Effiroad 토스쇼핑 AI · 월 1,000만 원 목표
 */
import { buildJarvisMonthlyBrief, JARVIS_NAME } from "./jarvis-engine";
import type { IntegrationStatus, JarvisConfidenceReport } from "../types";

export const DEFAULT_MONTHLY_GOAL_KRW = 10_000_000;

export function getMonthlyGoalKrw(): number {
  const raw = process.env.TOSS_SHOP_MONTHLY_GOAL_KRW?.trim();
  if (!raw) return DEFAULT_MONTHLY_GOAL_KRW;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTHLY_GOAL_KRW;
}

export type GoalProgress = {
  goalKrw: number;
  projectedMonthlyKrw: number;
  gapKrw: number;
  progressPct: number;
  onTrack: boolean;
  actualMonthlyKrw?: number;
};

export type GoalMilestone = {
  week: number;
  label: string;
  targetCumulativeKrw: number;
  actions: string[];
};

export type GoalPickContribution = {
  keyword: string;
  mode: "consignment" | "import";
  monthlyProfitKrw: number;
  goalSharePct: number;
  scalePotential: "high" | "medium" | "low";
  geniusScore: number;
  pathNote: string;
};

export type TenMillionPlan = {
  goalKrw: number;
  progress: GoalProgress;
  requiredActiveSkus: number;
  recommendedMix: { consignment: number; import: number };
  milestones: GoalMilestone[];
  topContributors: GoalPickContribution[];
  geniusBrief: string;
  weeklyActions: string[];
  scalingLevers: string[];
};

export type PickForGoal = {
  keyword: string;
  mode: "consignment" | "import";
  monthlyProfitKrw: number;
  profitScore?: number;
  searchVolume?: number;
  competitionIntensity?: number;
  marginPct?: number;
  category?: string;
  jarvis?: JarvisConfidenceReport;
};

function scalePotential(input: PickForGoal): GoalPickContribution["scalePotential"] {
  const profit = input.monthlyProfitKrw;
  const vol = input.searchVolume ?? 5000;
  const comp = input.competitionIntensity ?? 1;
  if (profit >= 800_000 && vol >= 8000 && comp < 1.5) return "high";
  if (profit >= 400_000 || (vol >= 5000 && comp < 2)) return "medium";
  return "low";
}

/** Genius score 0–99: goal contribution + scalability + margin + velocity */
export function computeGeniusScore(input: PickForGoal, goalSharePct: number): number {
  const profitPart = Math.min(input.monthlyProfitKrw / 1_200_000, 1) * 35;
  const sharePart = Math.min(goalSharePct / 15, 1) * 25;
  const marginPart = Math.min((input.marginPct ?? 12) / 25, 1) * 15;
  const scale = scalePotential(input);
  const scalePart = scale === "high" ? 15 : scale === "medium" ? 9 : 4;
  const velocityPart = Math.min((input.searchVolume ?? 3000) / 15000, 1) * 10;
  const compBonus = (input.competitionIntensity ?? 1) < 1 ? 5 : 0;
  return Math.min(99, Math.round(profitPart + sharePart + marginPart + scalePart + velocityPart + compBonus));
}

export function buildGoalProgress(
  projectedMonthlyKrw: number,
  actualMonthlyKrw?: number,
): GoalProgress {
  const goalKrw = getMonthlyGoalKrw();
  const basis = actualMonthlyKrw != null && actualMonthlyKrw > 0 ? actualMonthlyKrw : projectedMonthlyKrw;
  const gapKrw = Math.max(0, goalKrw - basis);
  const progressPct = Math.min(100, Math.round((basis / goalKrw) * 1000) / 10);
  return {
    goalKrw,
    projectedMonthlyKrw,
    gapKrw,
    progressPct,
    onTrack: progressPct >= 100,
    actualMonthlyKrw,
  };
}

export function buildPickContributions(picks: PickForGoal[]): GoalPickContribution[] {
  const total = picks.reduce((s, p) => s + p.monthlyProfitKrw, 0) || 1;
  const goal = getMonthlyGoalKrw();

  return picks
    .map((p) => {
      const goalSharePct = Math.round((p.monthlyProfitKrw / goal) * 1000) / 10;
      const scale = scalePotential(p);
      return {
        keyword: p.keyword,
        mode: p.mode,
        monthlyProfitKrw: p.monthlyProfitKrw,
        goalSharePct,
        scalePotential: scale,
        geniusScore: computeGeniusScore(p, goalSharePct),
        pathNote:
          scale === "high"
            ? `단독 ${Math.ceil(goal / Math.max(p.monthlyProfitKrw, 1))}개 SKU급 · 확장 1순위`
            : scale === "medium"
              ? `포트폴리오 핵심 · ${Math.round(p.monthlyProfitKrw / total * 100)}% 기여`
              : `보조 SKU · 빠른 테스트용`,
      };
    })
    .sort((a, b) => b.geniusScore - a.geniusScore);
}

export function buildMilestones(progress: GoalProgress): GoalMilestone[] {
  const g = progress.goalKrw;
  return [
    {
      week: 1,
      label: "1주차 · 기반",
      targetCumulativeKrw: Math.round(g * 0.08),
      actions: [
        "Jarvis 90% 인증 1위 SKU 위탁/수입 등록 + 도매매(단품) 공급 확정",
        "토스 API 연동 · 경쟁가 모니터링 ON",
        "상위 3 경쟁사 썸네일·상세 벤치마킹",
      ],
    },
    {
      week: 2,
      label: "2주차 · 확장",
      targetCumulativeKrw: Math.round(g * 0.18),
      actions: [
        "추천 2–3위 SKU 추가 등록 (위탁 2 + 수입 1 권장)",
        "1주차 SKU 리뷰 10개 프로모션",
        "키워드 클러스터 3개 추가 SEO",
      ],
    },
    {
      week: 4,
      label: "4주차 · 가속",
      targetCumulativeKrw: Math.round(g * 0.45),
      actions: [
        "활성 SKU 5–8개 · 일 매출 추적",
        "저마진 SKU 정리 · 고수익 SKU 재고 확대",
        "시즌 키워드 선점 등록",
      ],
    },
    {
      week: 8,
      label: "8주차 · 스케일",
      targetCumulativeKrw: Math.round(g * 0.75),
      actions: [
        "월 500만+ SKU 2개 이상 확보",
        "자동 재주문·공급처 MOQ 협상",
        "신규 카테고리 1개 테스트",
      ],
    },
    {
      week: 12,
      label: "12주차 · 목표",
      targetCumulativeKrw: g,
      actions: [
        `월 순수익 ${g.toLocaleString()}원 목표 달성 점검`,
        "Top 20% SKU에 마케팅·재고 집중",
        "다음 분기 키워드 파이프라인 갱신",
      ],
    },
  ];
}

export function buildTenMillionPlan(
  picks: PickForGoal[],
  actualMonthlyKrw?: number,
  integration?: IntegrationStatus,
): TenMillionPlan {
  const projected = picks.reduce((s, p) => s + p.monthlyProfitKrw, 0);
  const progress = buildGoalProgress(projected, actualMonthlyKrw);
  const contributors = buildPickContributions(picks);
  const avgPickProfit = picks.length ? projected / picks.length : 0;
  const requiredActiveSkus = avgPickProfit > 0 ? Math.ceil(progress.gapKrw / avgPickProfit) + picks.length : 12;

  const consignmentProfit = picks.filter((p) => p.mode === "consignment").reduce((s, p) => s + p.monthlyProfitKrw, 0);
  const importProfit = picks.filter((p) => p.mode === "import").reduce((s, p) => s + p.monthlyProfitKrw, 0);
  const total = consignmentProfit + importProfit || 1;
  const consignmentShare = Math.round((consignmentProfit / total) * 10);
  const importShare = 10 - consignmentShare;

  const milestones = buildMilestones(progress);

  const scalingLevers = [
    progress.gapKrw > 0
      ? `활성 SKU ${Math.min(requiredActiveSkus, 20)}개까지 확장 (현재 AI 10선 → ${Math.ceil(progress.gapKrw / Math.max(avgPickProfit, 200_000))}개 추가 필요)`
      : "목표 달성 구간 — SKU 깊이(재고·광고) 확대",
    consignmentProfit >= importProfit
      ? "위탁 비중 ↑ · 도매매 단품(MOQ≤1) API 실공급가로 마진 방어"
      : "수입 비중 ↑ · 1688/라쿠텐 프리미엄 라인",
    "Jarvis 90% 인증 SKU에 80% 시간 투입 (파레토)",
    "토스 카탈로그 대표아이템(총액 최저) 유지 · API 실데이터 연동 시 주 1회 재분석",
  ];

  const top = contributors[0];
  const certifiedCount = picks.filter((p) => p.jarvis?.certified).length;
  const integrationStatus: IntegrationStatus = integration ?? {
    score: 0,
    tossApi: false,
    wholesaleApi: false,
    liveCatalog: false,
    domemePreferred: true,
    readyFor90: false,
    missing: ["토스 API", "도매매 API", "실데이터"],
  };

  const jarvisBrief = buildJarvisMonthlyBrief({
    picks: picks.map((p) => ({
      monthlyProfitKrw: p.jarvis?.certified ? p.monthlyProfitKrw : 0,
      jarvis: p.jarvis,
    })),
    integration: integrationStatus,
  });

  const certifiedProfit = picks
    .filter((p) => p.jarvis?.certified)
    .reduce((s, p) => s + p.monthlyProfitKrw, 0);

  const geniusBrief = progress.onTrack
    ? `${JARVIS_NAME}: 90% 인증 ${certifiedCount}개 · 인증 SKU 월 ${certifiedProfit.toLocaleString()}원 · 전체 예상 ${projected.toLocaleString()}원(${progress.progressPct}%). 「${top?.keyword ?? ""}」 1순위. ${jarvisBrief}`
    : `${JARVIS_NAME}: 월 ${progress.goalKrw.toLocaleString()}원 목표 · 90% 인증 ${certifiedCount}개 · 예상 ${projected.toLocaleString()}원(${progress.progressPct}%) · 부족 ${progress.gapKrw.toLocaleString()}원. ${jarvisBrief}`;

  const weeklyActions = milestones[0].actions.concat(milestones[1].actions.slice(0, 2));

  return {
    goalKrw: progress.goalKrw,
    progress,
    requiredActiveSkus: Math.min(Math.max(requiredActiveSkus, 5), 25),
    recommendedMix: {
      consignment: Math.max(3, Math.round(5 * (consignmentShare / 10))),
      import: Math.max(2, Math.round(5 * (importShare / 10))),
    },
    milestones,
    topContributors: contributors.slice(0, 5),
    geniusBrief,
    weeklyActions,
    scalingLevers,
  };
}

export function rankPicksForGoal<T extends PickForGoal & { id?: string }>(picks: T[]): T[] {
  const goal = getMonthlyGoalKrw();
  return [...picks].sort((a, b) => {
    const scoreA =
      computeGeniusScore(a, (a.monthlyProfitKrw / goal) * 100) * 0.6 +
      (a.monthlyProfitKrw / 100_000) * 0.4;
    const scoreB =
      computeGeniusScore(b, (b.monthlyProfitKrw / goal) * 100) * 0.6 +
      (b.monthlyProfitKrw / 100_000) * 0.4;
    return scoreB - scoreA;
  });
}
