/**
 * Jarvis Autopilot — 시장·경쟁·소싱·등록·광고·발주 전체 오케스트레이션
 */

import type { TossApiConfig } from "../api/config";
import type {
  ConsignmentPick,
  ImportPick,
  JarvisAutopilotReport,
  JarvisListingDraft,
  MerchantData,
} from "../types";
import { buildAdCampaignPlan } from "./ad-strategy-engine";
import { getAutopilotMaxDraftsPerCycle } from "./jarvis-config";
import { filterJarvisCertifiedPicks } from "./jarvis-engine";
import { buildListingDraftFromPick } from "./listing-automation";
import { analyzeWholesaleComposition } from "./wholesale-composition-engine";
import { processFulfillmentCycle } from "./fulfillment-engine";
import { computeSourcingPlan } from "./sourcing-plan";
import { computeAdEconomics, bestCartCouponDiscount } from "./toss-growth-levers";
import { getMonthlyGoalKrw } from "./goal-engine";
import { analyzeWinnerSkus } from "./winner-sku-engine";
import { filterCertainPicks } from "./certainty-gate";

export const JARVIS_AUTOPILOT_VERSION = "1.0";

export function isAutopilotEnabled(): boolean {
  return process.env.JARVIS_AUTOPILOT_ENABLED !== "false";
}

export function isAutoExecuteEnabled(): boolean {
  return process.env.JARVIS_AUTO_EXECUTE === "true";
}

export type AutopilotCycleInput = {
  merchantId: string;
  accountEmail: string;
  data: MerchantData;
  catalog: import("../types").CatalogProduct[];
  config: TossApiConfig | null;
  now?: string;
};

export async function runJarvisAutopilotCycle(
  input: AutopilotCycleInput,
): Promise<JarvisAutopilotReport> {
  const now = input.now ?? new Date().toISOString();
  const actions: string[] = [];
  const errors: string[] = [];

  let draftsCreated = 0;
  let draftsExecuted = 0;
  let fulfillmentNew = 0;

  const consignmentPicks = input.data.consignmentPicks ?? [];

  // 2단 게이트:
  //  1) Jarvis 93% — 점수 기반 (여러 지표의 가중합)
  //  2) 확실성 게이트 — 근거가 실측인지 따진다. 점수가 높아도 공급처·원가·등급이
  //     추정이면 통과시키지 않는다. 추정치에 광고비를 걸 수 없기 때문.
  const scored = filterJarvisCertifiedPicks(consignmentPicks);
  const { certain, rejected } = filterCertainPicks(scored);
  const certified = certain;

  if (rejected.length) {
    // 왜 떨어졌는지 남긴다 — 기준을 낮추는 대신 원인을 고치기 위해
    const topReasons = rejected.slice(0, 3).map((r) => r.verdict.reason);
    actions.push(`확실성 미달 ${rejected.length}건 제외 — ${topReasons.join(" / ")}`);
  }

  const listingDrafts = input.data.listingDrafts ?? [];
  const pendingDraftIds = new Set(
    listingDrafts.filter((d) => !["rejected", "failed"].includes(d.status)).map((d) => d.pickId),
  );

  // 이번 사이클에 몇 개를 만들지 목표 달성확률에서 역산한다.
  // 이미 등록된(published) SKU가 많을수록 필요 수가 줄어든다.
  const publishedCount = listingDrafts.filter((d) => d.status === "published").length;
  const repPick = (certified[0] ?? consignmentPicks[0]) as ConsignmentPick | undefined;
  const sourcingPlan = repPick
    ? computeSourcingPlan({
        currentSkus: publishedCount,
        econ: {
          baselineDailyUnits: Math.max(0.3, repPick.estimatedDailyUnits ?? 1),
          netProfitPerUnitKrw:
            repPick.catalogEntry?.best.netProfitKrw ??
            Math.max(1, Math.round(repPick.recommendedPriceKrw * 0.25)),
          competitionIntensity: repPick.competitionIntensity,
          competitorAvgReviews: repPick.competitorLandscape?.avgReviewCount,
          seoScore: repPick.seo?.score,
        },
        dataQuality: repPick.profitProbability?.confidence === "high" ? "live" : "demo",
        goalKrw: getMonthlyGoalKrw(),
      })
    : null;

  if (sourcingPlan) {
    actions.push(`소싱 계획: ${sourcingPlan.reason}`);
  }

  if (isAutopilotEnabled() && certified.length) {
    // 목표에서 역산한 값과 안전 상한 중 작은 쪽을 쓴다
    const maxDrafts = Math.min(
      getAutopilotMaxDraftsPerCycle(),
      sourcingPlan?.dailyTarget ?? getAutopilotMaxDraftsPerCycle(),
    );
    let createdThisCycle = 0;
    for (const pick of certified as ConsignmentPick[]) {
      if (createdThisCycle >= maxDrafts) break;
      if (pendingDraftIds.has(pick.id)) continue;
      try {
        const draft = await buildListingDraftFromPick({
          merchantId: input.merchantId,
          pick,
          mode: "consignment",
          draftId: `jl_auto_${Date.now().toString(36)}_${createdThisCycle}`,
          now,
        });

        if (pick.wholesaleBest) {
          draft.wholesaleComposition = analyzeWholesaleComposition({
            pick,
            wholesale: pick.wholesaleBest,
            catalog: input.catalog,
          });
        }
        draft.adCampaign = buildAdCampaignPlan(pick, "consignment");

        // 광고 손익분기 CPC — 토스는 광고 판매분 수수료가 0%라 입찰 상한이 계산된다
        const unitNet =
          pick.catalogEntry?.best.netProfitKrw ??
          Math.max(1, Math.round(pick.recommendedPriceKrw * 0.25));
        draft.adEconomics = computeAdEconomics({
          priceKrw: pick.recommendedPriceKrw,
          grossMarginKrw: unitNet,
          conversionRatePct: 3,
          alreadyFeeFree: false,
        });
        draft.cartCoupon = bestCartCouponDiscount({
          priceKrw: pick.recommendedPriceKrw,
          netProfitPerUnitKrw: unitNet,
          abandonedCarts: 30,
        });

        listingDrafts.unshift(draft);
        pendingDraftIds.add(pick.id);
        draftsCreated++;
        createdThisCycle++;
        actions.push(`위탁 SKU 「${pick.keyword}」 등록 초안 (${createdThisCycle}/${maxDrafts})`);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "DRAFT_CREATE_FAIL");
      }
    }
  }

  for (const draft of listingDrafts) {
    if (!draft.adCampaign && draft.pickMode === "consignment") {
      const pick = consignmentPicks.find((p) => p.id === draft.pickId);
      if (pick) draft.adCampaign = buildAdCampaignPlan(pick, "consignment");
    }
  }

  if (input.config) {
    try {
      const { jobs, result } = await processFulfillmentCycle({
        merchantId: input.merchantId,
        config: input.config,
        listingDrafts,
        existingJobs: input.data.fulfillmentJobs ?? [],
      });
      input.data.fulfillmentJobs = jobs;
      fulfillmentNew = result.newJobs;
      if (result.newJobs) actions.push(`신규 주문 ${result.newJobs}건 → 도매매 발주 준비`);
      if (result.wholesalePrepared) actions.push(`발주 정보 ${result.wholesalePrepared}건 기록`);
      if (result.trackingRegistered) actions.push(`송장 ${result.trackingRegistered}건 토스 등록`);
      errors.push(...result.errors);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "FULFILLMENT_FAIL");
    }
  }

  // 효자상품 판정 — 예측이 아니라 실제 정산(입금액)으로만 등급을 매긴다.
  // 광고·재고를 어디에 몰아줄지는 예측 점수가 아니라 이 결과가 정한다.
  const winners = analyzeWinnerSkus({
    settlements: input.data.settlements ?? [],
    goalKrw: getMonthlyGoalKrw(),
    now,
  });
  if (winners.heroes.length) {
    actions.push(
      `효자 ${winners.heroes.length}개 확인 (실측 월 ${winners.actualMonthlyNetKrw.toLocaleString()}원 · 목표의 ${winners.goalProgressPct}%)`,
    );
  }
  if (winners.drains.length) {
    actions.push(`정리대상 ${winners.drains.length}개 — 광고 중단 권고`);
  }

  const certifiedCount = certified.length;
  const pendingReview = listingDrafts.filter((d) => d.status === "pending_review").length;
  const published = listingDrafts.filter((d) => d.status === "published").length;
  const activeJobs = (input.data.fulfillmentJobs ?? []).filter(
    (j) => !["tracking_registered", "cancelled"].includes(j.status),
  ).length;

  return {
    engineVersion: JARVIS_AUTOPILOT_VERSION,
    ranAt: now,
    enabled: isAutopilotEnabled(),
    autoExecute: isAutoExecuteEnabled(),
    actions,
    errors: errors.slice(0, 10),
    stats: {
      certifiedSkus: certifiedCount,
      draftsCreated,
      draftsExecuted,
      pendingReview,
      published,
      fulfillmentActive: activeJobs,
      fulfillmentNew,
    },
    brief:
      certifiedCount > 0
        ? `Jarvis Autopilot — 인증 SKU ${certifiedCount} · OK대기 ${pendingReview} · 등록 ${published} · 발주대기 ${activeJobs}`
        : "Jarvis Autopilot — 93% 인증 SKU 없음 · 연동·도매매 API 확인",
    winners,
    nextSteps: buildNextSteps({
      certifiedCount,
      pendingReview,
      published,
      activeJobs,
      hasApi: Boolean(input.config),
      hasWholesale: Boolean(process.env.DOMEGGOOK_API_KEY),
    }),
  };
}

function buildNextSteps(input: {
  certifiedCount: number;
  pendingReview: number;
  published: number;
  activeJobs: number;
  hasApi: boolean;
  hasWholesale: boolean;
}): string[] {
  const steps: string[] = [];
  if (!input.hasApi) steps.push("토스 FEP API 연동 → 설정");
  if (!input.hasWholesale) steps.push("DOMEGGOOK_API_KEY → 도매매 실시간 소싱");
  if (input.pendingReview > 0 && !isAutoExecuteEnabled()) {
    steps.push(`등록함 ${input.pendingReview}건 → OK · Jarvis 전체 실행`);
  }
  if (input.pendingReview > 0 && isAutoExecuteEnabled()) {
    steps.push(`등록함 ${input.pendingReview}건 — JARVIS_AUTO_EXECUTE ON (cron 자동 실행)`);
  }
  if (input.activeJobs > 0) steps.push(`발주함 ${input.activeJobs}건 → 도매매 발주 + 송장 등록`);
  if (input.certifiedCount === 0) steps.push("93% 미달 SKU — Jarvis 게이트 통과 SKU 확보");
  if (steps.length === 0) steps.push("Autopilot 정상 — Jarvis가 60초마다 모니터링 중");
  return steps.slice(0, 5);
}

export function enrichDraftWithAutopilot(
  draft: JarvisListingDraft,
  pick: ConsignmentPick | ImportPick,
  catalog: import("../types").CatalogProduct[],
): JarvisListingDraft {
  const enriched = { ...draft };
  enriched.adCampaign = buildAdCampaignPlan(pick, draft.pickMode);
  if (draft.pickMode === "consignment" && "wholesaleBest" in pick && pick.wholesaleBest) {
    enriched.wholesaleComposition = analyzeWholesaleComposition({
      pick: pick as ConsignmentPick,
      wholesale: pick.wholesaleBest,
      catalog,
    });
  }
  return enriched;
}
