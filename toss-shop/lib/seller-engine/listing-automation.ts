/**
 * Jarvis Listing Automation — 소싱 → Hookable 상세 → 등록 초안 → 사용자 OK → 전체 실행
 */

import type {
  ConsignmentPick,
  ImportPick,
  JarvisListingDraft,
  JarvisListingPayload,
  TossShopCategory,
} from "../types";
import { buildJarvisDetailPage } from "./detail-page-engine";
import { buildJarvisPickBrief } from "./jarvis-pick-brief";
import { JARVIS_CONFIDENCE_THRESHOLD } from "./jarvis-engine";
import { checkListingCompliance, type ListingComplianceIssue } from "./toss-policy-engine";
import { readSupplierReturnPolicy } from "../wholesale/supplier-return-policy";

export const LISTING_AUTOMATION_VERSION = "2.0";

const CATEGORY_HINT: Record<TossShopCategory, string> = {
  food: "식품",
  beauty: "뷰티",
  home: "생활/홈",
  digital: "디지털/가전",
  fashion: "패션",
  health: "건강/헬스",
};

function discountOrigin(sale: number): number {
  return Math.round(sale / 0.92);
}

function buildSellerChecklist(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): string[] {
  const steps: string[] = [
    "Draph/OpenAI Premium 상세 + 키워드·가격 자동 생성",
    "OK · Jarvis 전체 실행 → 토스 등록 + 위탁 발주(위탁만)",
  ];
  if (pick.jarvis?.certified) {
    steps.push(`Jarvis ${pick.jarvis.confidencePct}% 인증 SKU`);
  }
  if (pick.topSellerPlaybook?.jarvisActions.length) {
    steps.push(...pick.topSellerPlaybook.jarvisActions.slice(0, 3));
  }
  if (mode === "consignment" && "wholesaleBest" in pick && pick.wholesaleBest) {
    steps.push(
      `${pick.wholesaleBest.platform === "domeme" ? "도매매" : "도매꾹"} 발주 URL 자동 기록 · MOQ ${pick.wholesaleBest.moq}`,
    );
  }
  if (mode === "import") {
    steps.push("수입판매 — 발주는 수동(1688/일본 소싱 URL 확인)");
  }
  if (pick.riskPlaybook?.mandatoryActions.length) {
    steps.push(...pick.riskPlaybook.mandatoryActions.slice(0, 2));
  }
  steps.push("등록 후 2주 리뷰·전환 모니터링 → 효자 SKU 확대");
  return steps.slice(0, 8);
}

function buildListingPayload(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
  detailKeywords: string[],
): JarvisListingPayload {
  const salePrice = pick.recommendedPriceKrw;
  const wholesale = mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;

  return {
    name: (pick.suggestedTitle ?? pick.productName).slice(0, 100),
    brandName: "에피로드",
    salePrice,
    originPrice: discountOrigin(salePrice),
    searchKeywords: detailKeywords.slice(0, 10),
    description: (pick.aiSummary ?? pick.productName).slice(0, 1500),
    categoryHint: CATEGORY_HINT[pick.category],
    category: pick.category,
    deliveryFeeType: salePrice >= 15000 ? "FREE" : "CONDITIONALLY_FREE",
    supplierUrl: wholesale?.url ?? (mode === "import" && "importBest" in pick ? pick.importBest?.url : undefined),
    supplierPlatform:
      wholesale?.platform ??
      (mode === "import" && "sourceCountry" in pick ? pick.sourceCountry : undefined),
    // 공급처 단위 반품지 매핑 키. 도매꾹/도매매는 플랫폼 하나에 공급사가
    // 수천 개라 플랫폼 단위로는 반품지를 특정할 수 없다.
    supplierId: wholesale?.sellerId,
    supplierName: wholesale?.sellerNick ?? wholesale?.sellerId,
    // 반품 처리 주체를 공급처 안내 원문에서 판독한다. 텍스트가 없으면
    // unknown → 반품지 결정이 fail-closed로 막힌다(전용 주소 필요).
    returnHandling: readSupplierReturnPolicy(wholesale?.policyText).handling,
  };
}

export type BuildListingDraftInput = {
  merchantId: string;
  pick: ConsignmentPick | ImportPick;
  mode: "consignment" | "import";
  draftId: string;
  now?: string;
};

export async function buildListingDraftFromPick(
  input: BuildListingDraftInput,
): Promise<JarvisListingDraft> {
  const { pick, mode, merchantId, draftId } = input;
  const now = input.now ?? new Date().toISOString();
  const detailPage = await buildJarvisDetailPage(pick, mode);
  const listingPayload = buildListingPayload(pick, mode, detailPage.searchKeywords);
  const sellerChecklist = buildSellerChecklist(pick, mode);
  const pickBrief = buildJarvisPickBrief(pick, mode);

  const confidence = pick.jarvis?.confidencePct ?? 0;
  const certified = pick.jarvis?.certified ?? false;

  // 토스 등록 규칙 위반은 미노출·페널티로 직결되므로 등록 전에 잡는다.
  // block 등급(비법정 계량단위 등)이 있으면 인증됐어도 자동 등록을 막는다.
  const compliance = checkListingCompliance({
    name: listingPayload.name,
    searchKeywords: listingPayload.searchKeywords,
  });
  const hasBlocker = compliance.some((c) => c.severity === "block");

  return {
    id: draftId,
    merchantId,
    pickId: pick.id,
    pickMode: mode,
    keyword: pick.keyword,
    status:
      certified && confidence >= JARVIS_CONFIDENCE_THRESHOLD && !hasBlocker ? "pending_review" : "draft",
    compliance,
    jarvisConfidence: confidence,
    jarvisCertified: certified,
    detailPage,
    listingPayload,
    pickBrief,
    sellerChecklist,
    createdAt: now,
    updatedAt: now,
  };
}

export function pickSourceId(pick: ConsignmentPick | ImportPick): string {
  return pick.id;
}
