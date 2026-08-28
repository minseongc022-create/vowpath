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
import { checkPriceSanity } from "./price-sanity";

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

/**
 * 등록함에 보이는 안내 — 사장님에게 시키는 건 최소한만
 *
 * 이 목록은 등록함 화면에서 상위 4개만 보인다. 그래서 "하면 좋은 일"을 잔뜩
 * 넣으면 정작 봐야 할 게 묻히고, 목록 자체를 안 읽게 된다. 사장님 지시로
 * 사람 몫 항목은 초기 리뷰 하나만 남겼다.
 */
function buildSellerChecklist(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): string[] {
  // 사람에게 시키는 항목은 **초기 리뷰 하나만** 남긴다.
  //
  // 사장님 지시: 단가 협상·트렌드 캐치·샘플 검수·분쟁 판단·규제 확인 같은 건
  // 체크리스트에서 빼라 — 매 상품마다 할 일 목록으로 늘어놓으면 실제로는
  // 아무것도 안 하게 되고, 등록함이 잔소리 판이 된다. 그것들은 "하면 좋은
  // 일"이지 이 상품을 올리기 위한 조건이 아니다.
  //
  // 초기 리뷰만 남긴 이유: 토스 카탈로그 대표 노출이 신뢰 신호(리뷰)에
  // 좌우되는데 등록 직후엔 그게 0이라, 광고비를 태워도 노출로 안 이어진다.
  // 이건 상품 하나하나의 매출에 직접 걸리는 문제라 남긴다.
  const steps: string[] = [
    "등록 후 1~2주 안에 초기 리뷰 5개+ 확보하면 노출이 크게 붙습니다 (권장)",
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

/**
 * 반품 물류 두뇌가 내린 결정 — 등록 초안에 실려 토스 등록까지 그대로 간다.
 * 넘기지 않으면 종전처럼 매핑/기본 반품지에 기대는 경로로 떨어진다.
 */
export type ResolvedReturn = {
  locationId?: number;
  returnNote?: string;
  returnHandling?: import("../wholesale/supplier-return-policy").ReturnHandling;
  /** 공급처 안내에서 읽은 배송·반품 조건 — 등록 값으로 그대로 쓴다 */
  supplierPolicy?: import("../wholesale/supplier-policy-reader").ListingPolicyValues;
};

/**
 * 우리 상품명을 만든다 — 공급사 원본과 겹치지 않게.
 *
 * 브랜드명을 앞에 붙이되, 이미 들어 있으면 두 번 붙이지 않는다.
 * 토스 상품명 제한(100자)을 넘지 않게 뒤를 자른다.
 */
export function buildDistinctProductName(baseTitle: string, brand: string): string {
  const base = baseTitle.trim();
  if (!base) return brand;
  if (base.includes(brand)) return base.slice(0, 100);
  return `${brand} ${base}`.slice(0, 100);
}

function buildListingPayload(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
  detailKeywords: string[],
  resolvedReturn?: ResolvedReturn,
): JarvisListingPayload {
  const salePrice = pick.recommendedPriceKrw;
  const wholesale = mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;

  return {
    // ★ 상품명은 공급사 원본과 달라야 한다 — 두 가지 이유가 겹친다
    //
    // 1) 토스가 거절한다: "다른 상품과 겹치지 않는 상품명만 쓸 수 있어요."
    //    같은 도매 상품을 여러 셀러가 원본명 그대로 올리면 충돌한다.
    // 2) 우리 상위셀러 전술(title_thumb_diff)이 요구하는 것이기도 하다 —
    //    원본명 그대로 올리면 동일 SKU끼리 가격 경쟁만 하게 된다.
    //
    // 우리 브랜드명을 앞에 붙인다. 지어낸 수식어가 아니라 실제 판매자명이라
    // 사실에 어긋나지 않으면서 이름이 우리 것으로 구별된다.
    name: buildDistinctProductName(pick.suggestedTitle ?? pick.productName, "에피로드"),
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
    // 반품 처리 주체를 공급처 안내 원문에서 판독한다. 상세 조회로 보강된
    // 텍스트가 있으면 여기서 수거형·반송형까지 구분된다.
    returnHandling:
      resolvedReturn?.returnHandling ?? readSupplierReturnPolicy(wholesale?.policyText).handling,
    // 두뇌가 공급처 주소를 대조해 확정한 반품지. 이게 실리면 매핑 JSON 없이도
    // 공급처별 반품지가 정확히 걸린다.
    resolvedReturnLocationId: resolvedReturn?.locationId,
    returnNote: resolvedReturn?.returnNote,
    supplierPolicy: resolvedReturn?.supplierPolicy,
  };
}

export type BuildListingDraftInput = {
  merchantId: string;
  pick: ConsignmentPick | ImportPick;
  mode: "consignment" | "import";
  draftId: string;
  now?: string;
  /** 반품 물류 두뇌의 결정 — 무인 등록 경로에서 항상 넘어온다 */
  resolvedReturn?: ResolvedReturn;
};

export async function buildListingDraftFromPick(
  input: BuildListingDraftInput,
): Promise<JarvisListingDraft> {
  const { pick, mode, merchantId, draftId } = input;
  const now = input.now ?? new Date().toISOString();

  // ★ 초안을 만들기 전에 가격이 상식적인지 본다.
  //
  // 소싱 단계에도 같은 검사가 있지만 여기서 한 번 더 한다. 이 함수는
  // 소싱을 거치지 않은 픽(옛 엔진이 저장해 둔 것, 수동 생성)으로도
  // 호출되기 때문이다. 실제로 수정 전 엔진이 만든 2,700만원짜리 픽이
  // 저장소에 남아 검수 화면까지 올라왔다.
  //
  // 여기서 막으면 어떤 경로로 들어온 픽이든 잘못된 가격이 상품이 되지 못한다.
  const sanity = checkPriceSanity({
    priceKrw: pick.recommendedPriceKrw,
    // 수입판매(ImportPick)에는 위탁 공급가 개념이 없다 — 판매가만 본다.
    supplierCostKrw: "supplierCostKrw" in pick ? pick.supplierCostKrw : undefined,
  });
  if (!sanity.sane) {
    throw new Error(`PRICE_SANITY: ${sanity.reason}`);
  }

  const detailPage = await buildJarvisDetailPage(pick, mode, input.resolvedReturn?.returnNote);
  const listingPayload = buildListingPayload(
    pick,
    mode,
    detailPage.searchKeywords,
    input.resolvedReturn,
  );
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
