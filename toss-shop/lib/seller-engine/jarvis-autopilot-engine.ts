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
import { buildListingDraftFromPick, type ResolvedReturn } from "./listing-automation";
import { analyzeWholesaleComposition } from "./wholesale-composition-engine";
import { processFulfillmentCycle } from "./fulfillment-engine";
import { computeSourcingPlan } from "./sourcing-plan";
import { computeAdEconomics, bestCartCouponDiscount } from "./toss-growth-levers";
import { getMonthlyGoalKrw } from "./goal-engine";
import { analyzeWinnerSkus } from "./winner-sku-engine";
import { filterCertainPicks } from "./certainty-gate";
import { listTossReturnLocations, type TossReturnLocation } from "../api/return-location-lookup";
import { describeReturnLocationConfig } from "../api/exchange-return-location";
import { decideReturnForListing } from "./return-decision-pipeline";
import { canPublishWithDecision, returnRouteLabel } from "./return-logistics-brain";
import {
  planReturnLocationProvisioning,
  renderProvisioningInstructions,
} from "./return-location-provisioner";
import type { ProvisioningRequest } from "./return-logistics-brain";
import { checkSupplierAutonomy } from "../wholesale/supplier-autonomy-filter";

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

  // 반품지 목록은 사이클당 한 번만 읽는다 — 같은 사이클 안에서 판단 기준이
  // 흔들리지 않게 하기 위해서다. 조회에 실패해도 사이클을 멈추지 않는다:
  // 목록이 비면 공급처 매칭이 안 될 뿐이고, 셀러 경유 후보로는 계속 채울 수 있다.
  let registeredLocations: TossReturnLocation[] = [];
  if (input.config) {
    try {
      const res = await listTossReturnLocations(input.merchantId, input.config);
      registeredLocations = res.locations;
    } catch (e) {
      errors.push(
        `반품지 목록 조회 실패 — ${e instanceof Error ? e.message : "RETURN_LOCATION_LOOKUP_FAIL"}. 공급처별 자동 매칭 없이 진행합니다.`,
      );
    }
  }
  const sellerOwnedLocationId = describeReturnLocationConfig().sellerOwnedId;

  // 반품지가 없어 못 판 공급처 — 사이클 끝에 "등록할 가치가 있는 것만" 추린다
  const blockedByReturnLocation: Array<{
    request: ProvisioningRequest;
    monthlyValueKrw?: number;
  }> = [];
  let skippedByReturn = 0;
  /** 전역 반품지 설정 경고는 사이클당 한 번만 — 후보 수만큼 반복하면 로그가 묻힌다 */
  let returnConfigWarned = false;

  /**
   * 사이클당 공급처 상세 조회 예산.
   *
   * 이 사이클은 60초마다 돈다. 후보가 수십 개인데 전부 상세를 조회하면 도매꾹
   * API 호출이 분당 수십 건이 되어 레이트리밋에 걸리고, 그러면 상세를 못 읽어
   * 전 상품이 판독 실패로 떨어진다 — 자동화가 조용히 멈춘다.
   *
   * 그래서 "만들 초안 수의 몇 배"까지만 본다. 거절된 후보도 예산을 쓰므로,
   * 예산이 바닥나면 이번 사이클은 여기서 접고 다음 사이클에 이어서 본다.
   * 조회 결과는 6시간 캐시되므로 다음 사이클은 훨씬 적게 쓴다.
   */
  let detailBudget = 0;

  if (isAutopilotEnabled() && certified.length) {
    // 목표에서 역산한 값과 안전 상한 중 작은 쪽을 쓴다
    const maxDrafts = Math.min(
      getAutopilotMaxDraftsPerCycle(),
      sourcingPlan?.dailyTarget ?? getAutopilotMaxDraftsPerCycle(),
    );
    detailBudget = maxDrafts * 4;
    let createdThisCycle = 0;
    for (const pick of certified as ConsignmentPick[]) {
      if (createdThisCycle >= maxDrafts) break;
      if (detailBudget <= 0) {
        actions.push(
          "공급처 상세 조회 예산 소진 — 다음 사이클에 이어서 봅니다 (도매꾹 API 과호출 방지)",
        );
        break;
      }
      if (pendingDraftIds.has(pick.id)) continue;
      try {
        // ── 반품이 어디로 가야 하는지부터 정한다 ──────────────────
        //
        // 여기서 막히면 사람을 기다리지 않고 **다음 후보로 넘어간다**.
        // 한 공급처가 막혔다고 그날 등록이 멈추면 자동화가 아니다.
        let resolvedReturn: ResolvedReturn | undefined;
        if (pick.wholesaleBest) {
          // 검색 응답만으로 이미 "팔 수 없다"가 확정되는 경우는 상세 조회 예산을
          // 쓰지 않고 바로 버린다. 반품 불가 공급처는 주소를 알아내봐야 못 판다.
          const autonomy = checkSupplierAutonomy({
            listing: pick.wholesaleBest,
            registeredLocations,
            sellerOwnedLocationId,
          });
          if (autonomy.verdict === "unsellable") {
            skippedByReturn++;
            actions.push(`「${pick.keyword}」 제외 — ${autonomy.reason}`);
            continue;
          }

          const unitNetForReturn =
            pick.catalogEntry?.best.netProfitKrw ??
            Math.max(1, Math.round(pick.recommendedPriceKrw * 0.25));
          detailBudget--;
          const { decision, returnNote, listing, policyValues } = await decideReturnForListing({
            listing: pick.wholesaleBest,
            registeredLocations,
            sellerOwnedLocationId,
            netProfitPerUnitKrw: unitNetForReturn,
          });
          // 보강된 리스팅을 되돌려 넣는다 — 이후 상세·발주가 같은 사실을 본다
          pick.wholesaleBest = listing;

          if (decision.route === "needs_provisioning" && decision.provisioning) {
            blockedByReturnLocation.push({
              request: decision.provisioning,
              monthlyValueKrw: Math.round(
                unitNetForReturn * Math.max(0.3, pick.estimatedDailyUnits ?? 1) * 30,
              ),
            });
            skippedByReturn++;
            continue;
          }
          if (!canPublishWithDecision(decision)) {
            // 전역 설정 누락은 다음 후보로 넘어가도 똑같이 막힌다 — 건너뛰면
            // 하루치가 통째로 사라지고 사장님은 이유를 모른다. 그래서 초안은
            // 그대로 만들고(등록 단계에서 막힌다) 설정하라고 한 번만 알린다.
            if (decision.blocker === "global_config") {
              if (!returnConfigWarned) {
                returnConfigWarned = true;
                actions.push(`반품지 설정 필요 — ${decision.rejectReason}`);
              }
            } else {
              skippedByReturn++;
              actions.push(
                `「${pick.keyword}」 제외 — ${returnRouteLabel(decision.route)}: ${decision.rejectReason ?? "반품 경로 미확정"}`,
              );
              continue;
            }
          }
          resolvedReturn = {
            locationId: decision.locationId,
            returnNote,
            supplierPolicy: policyValues,
          };
        }

        const draft = await buildListingDraftFromPick({
          merchantId: input.merchantId,
          pick,
          mode: "consignment",
          draftId: `jl_auto_${Date.now().toString(36)}_${createdThisCycle}`,
          now,
          resolvedReturn,
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

  // 반품지 때문에 막힌 건들 중 **뚫을 가치가 있는 것만** 추린다.
  // 전부 떠넘기면 하루 수십 건이 되어 자동화가 아니게 된다.
  const provisioningPlan = planReturnLocationProvisioning({ blocked: blockedByReturnLocation });
  if (skippedByReturn > 0) {
    actions.push(
      `반품 경로 미확정 ${skippedByReturn}건은 건너뛰고 등록 가능한 후보로 채웠습니다 — ${provisioningPlan.summary}`,
    );
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
    returnProvisioning: provisioningPlan.asks.length
      ? {
          summary: provisioningPlan.summary,
          instructions: renderProvisioningInstructions(provisioningPlan),
          asks: provisioningPlan.asks.map((a) => ({
            supplier: `${a.request.supplierPlatform}:${a.request.supplierId}`,
            name: a.request.suggestedName,
            address: a.request.address,
            blockedCount: a.blockedCount,
          })),
        }
      : undefined,
    nextSteps: buildNextSteps({
      certifiedCount,
      pendingReview,
      published,
      activeJobs,
      hasApi: Boolean(input.config),
      hasWholesale: Boolean(process.env.DOMEGGOOK_API_KEY),
      provisioningAsks: provisioningPlan.asks.length,
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
  provisioningAsks?: number;
}): string[] {
  const steps: string[] = [];
  // 반품지 등록은 토스가 API를 안 열어둬서 사람이 해야 하는 유일한 일이다.
  // 그래서 다른 안내보다 앞에 둔다 — 이걸 해두면 그 공급처는 영구 자동화된다.
  if (input.provisioningAsks) {
    steps.push(`반품지 ${input.provisioningAsks}곳 등록 → 막힌 상품 자동 해제`);
  }
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
