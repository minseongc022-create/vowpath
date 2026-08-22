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
import { filterJarvisCertifiedPicks } from "./jarvis-engine";
import { buildListingDraftFromPick } from "./listing-automation";
import { analyzeWholesaleComposition } from "./wholesale-composition-engine";
import { processFulfillmentCycle } from "./fulfillment-engine";

export const JARVIS_AUTOPILOT_VERSION = "1.0";

export function isAutopilotEnabled(): boolean {
  return process.env.JARVIS_AUTOPILOT_ENABLED !== "false";
}

export function isAutoExecuteEnabled(): boolean {
  return process.env.JARVIS_AUTO_EXECUTE === "true";
}

const DEFAULT_PICKS_PER_CYCLE = 3;

export function autopilotPicksPerCycle(): number {
  const raw = Number(process.env.JARVIS_AUTOPILOT_PICKS_PER_CYCLE);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_PICKS_PER_CYCLE;
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
  const certified = filterJarvisCertifiedPicks(consignmentPicks);

  const listingDrafts = input.data.listingDrafts ?? [];
  const pendingDraftIds = new Set(
    listingDrafts.filter((d) => !["rejected", "failed"].includes(d.status)).map((d) => d.pickId),
  );

  if (isAutopilotEnabled() && certified.length) {
    const candidates = (certified as ConsignmentPick[])
      .filter((pick) => !pendingDraftIds.has(pick.id))
      .slice(0, autopilotPicksPerCycle());

    for (const pick of candidates) {
      try {
        const draft = await buildListingDraftFromPick({
          merchantId: input.merchantId,
          pick,
          mode: "consignment",
          draftId: `jl_auto_${Date.now().toString(36)}_${draftsCreated}`,
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

        listingDrafts.unshift(draft);
        draftsCreated++;
        actions.push(`위탁 SKU 「${pick.keyword}」 등록 초안 자동 생성`);
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
