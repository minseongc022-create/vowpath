/**
 * Jarvis AI 상세페이지 생성 (Hookable-class)
 *
 * Matchcut 어댑터 → Hookable 템플릿 또는 1688 비전 파이프라인.
 * 상위셀러 전술(차별화·롱테일·셀링포인트 상단) 반영.
 */

import type { ConsignmentPick, ImportPick, JarvisDetailPageBundle } from "../types";
import { requestDetailPageFromProviders } from "./detail-page-providers";
import type { DetailPageProviderId } from "./detail-page-providers";
import { buildPersuasionPlan, renderObjectionsHtml, type PersuasionPlan } from "./buyer-psychology";
import { buildDetailPageHtml } from "./detail-page-html";

export const DETAIL_PAGE_ENGINE_VERSION = "3.0";

function mapProviderToSource(provider: DetailPageProviderId): JarvisDetailPageBundle["source"] {
  if (provider === "matchcut_pipeline") return "matchcut";
  if (provider === "openai_premium") return "openai_premium";
  if (provider === "hookable_api") return "hookable_api";
  if (provider === "draph") return "draph";
  if (provider === "sellerbiseo") return "sellerbiseo";
  if (provider === "hookable_local") return "jarvis_ai";
  return "jarvis_ai";
}

function extractKeywords(keyword: string, title: string, max = 10): string[] {
  const raw = `${keyword} ${title}`
    .split(/[\s,·/]+/)
    .map((w) => w.replace(/[^0-9a-zA-Z가-힣]/g, ""))
    .filter((w) => w.length >= 2 && w.length <= 10);
  const uniq = [...new Set(raw)];
  return uniq.slice(0, max);
}

/**
 * 셀링포인트를 **사는 사람 관점**으로 만든다.
 *
 * ⚠️ 여기는 원래 셀러 관점 문구가 들어가던 자리였다 — "순마진 18% 확보",
 * "도매매 단품(MOQ≤1)", "정책 체크 6항목 준수" 같은 것들. 이건 전부 셀러가
 * 알고 싶은 정보지 고객이 알고 싶은 정보가 아니다. 상세페이지에 내 마진율이
 * 적혀 있으면 고객은 "얘가 얼마 남기는구나"만 읽고 나간다.
 *
 * 그래서 지금은 구매심리 엔진에 넘겨 **고객이 살지 말지 정하는 데 쓰는 사실**만
 * 남긴다: 언제 오는지, 얼마나 싼지, 실패하면 되돌릴 수 있는지.
 * 과장·최상급 표현은 엔진이 규칙으로 걸러낸다.
 */
function buildSellingPoints(
  pick: ConsignmentPick | ImportPick,
  returnNote?: string,
): { points: string[]; plan: PersuasionPlan } {
  const wholesale = "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const landscape = pick.competitorLandscape;

  // 상위셀러 전술 중 **고객에게 보이는 것**만 원문 후보로 넘긴다.
  // 전술 제목은 셀러용 표현이 많아 그대로 쓰면 어색하므로, 상품 구성·규격처럼
  // 고객이 확인할 수 있는 사실만 추린다.
  const specHighlights = (pick.topSellerPlaybook?.tactics ?? [])
    .filter((t) => t.applied && /구성|규격|용량|사이즈|색상|세트/.test(t.title))
    .slice(0, 2)
    .map((t) => t.title);

  const plan = buildPersuasionPlan({
    title: pick.suggestedTitle ?? pick.productName,
    keyword: pick.keyword,
    facts: {
      priceKrw: pick.recommendedPriceKrw,
      category: pick.category,
      // 공급처 등급이 실제로 판독된 경우에만 당일 출고를 말한다 — 추정으로
      // 배송 약속을 하면 지연 페널티가 셀러에게 돌아온다.
      sameDayShipping:
        wholesale?.supplierQuality?.verified === true &&
        wholesale.supplierQuality.shipSpeed === "same_day",
      freeShipping: wholesale?.freeShipping,
      // 경쟁 상품 중앙가와 비교한다 — 평균은 이상치 하나에 흔들려서
      // "평균보다 30% 싸다" 같은 과장된 문구가 나온다.
      competitorAvgKrw: pick.pricing?.competitorMedianKrw,
      competitorLowKrw: pick.pricing?.competitorLowKrw,
      competitorAvgReviews: landscape?.avgReviewCount,
      returnNote,
      specHighlights,
    },
  });

  return { points: plan.sellingPoints.slice(0, 5), plan };
}

export async function buildJarvisDetailPage(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
  /** 반품 물류 두뇌가 확정한 반품 안내 — 고객 불안을 푸는 가장 강한 문장이다 */
  returnNote?: string,
): Promise<JarvisDetailPageBundle> {
  const title = pick.suggestedTitle ?? pick.productName;
  const { points: sellingPoints, plan } = buildSellingPoints(pick, returnNote);
  const searchKeywords = extractKeywords(pick.keyword, title);
  const wholesale =
    mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const importUrl =
    mode === "import" && "importBest" in pick ? pick.importBest?.url : undefined;
  const importImage =
    mode === "import" && "importBest" in pick ? pick.importBest?.imageUrl : undefined;

  const detail = await requestDetailPageFromProviders({
    listingUrl: wholesale?.url ?? importUrl,
    referenceImageUrl: wholesale?.imageUrl ?? importImage,
    keyword: pick.keyword,
    productName: pick.productName,
    pick,
    mode,
    sellingPoints,
    generateAngles: mode === "import" && Boolean(importUrl?.includes("1688")),
  });

  if (detail.status === "ready" && detail.html) {
    // 구매 저항 해소 섹션은 상세 본문 **뒤에** 붙인다. 앞에 두면 사기도 전에
    // 걱정거리를 늘어놓는 꼴이 되고, 뒤에 두면 마음이 기운 뒤 마지막 확인이 된다.
    const objectionsHtml = renderObjectionsHtml(plan.objections);
    return {
      source: mapProviderToSource(detail.provider),
      html: objectionsHtml ? `${detail.html}${objectionsHtml}` : detail.html,
      thumbnailUrl: detail.thumbnailUrl,
      sellingPoints,
      searchKeywords,
      matchcutReady: detail.provider === "matchcut_pipeline",
      imageUrls: detail.generatedImages,
      detailProvider: detail.provider,
      detailCostKrw: detail.costEstimateKrw,
    };
  }

  // 상세페이지 생성이 실패해도 **공급처 실사진은 남긴다**.
  //
  // 토스는 상세 이미지가 하나도 없으면 등록을 거절한다
  // ("상세 이미지 또는 html을 찾을 수 없음"). 종전엔 생성이 실패하면
  // 참조 이미지까지 통째로 버려서, AI가 안 되는 순간 등록도 같이 멈췄다.
  // 실제로 OpenAI 크레딧이 떨어지자 그렇게 멈췄다.
  //
  // 공급처가 올린 사진은 그 상품의 실물 사진이다 — 생성 이미지가 없을 때
  // 쓸 수 있는 가장 정확한 자료이고, 없는 것보다 훨씬 낫다.
  const fallbackImage = wholesale?.imageUrl ?? importImage;

  // ★ AI가 안 돼도 상세페이지는 제대로 만든다
  //
  // 종전엔 여기서 `<p>상세페이지 생성 실패</p>` 한 줄만 남겼다. 그 결과
  // 상세에 작은 사진 한 장만 덩그러니 올라가 미리보기가 망가져 보였다.
  //
  // 상세페이지에 필요한 건 창작이 아니라 **사실의 배치**다 — 무엇인지,
  // 어떤 사양인지, 언제 오는지, 안 맞으면 어떻게 되는지. 전부 이미 아는
  // 값이라 AI 없이도 구매 결정 순서대로 놓을 수 있다. AI는 문장을 더
  // 매끄럽게 다듬는 역할이지, 없다고 페이지가 비어야 할 이유가 아니다.
  const objectionsHtml = renderObjectionsHtml(plan.objections);
  const html = buildDetailPageHtml({
    productName: title,
    sellingPoints,
    imageUrls: fallbackImage ? [fallbackImage] : [],
    dispatchDays: wholesale?.supplierQuality?.shipSpeed === "same_day" ? 1 : undefined,
    returnNote,
    objectionsHtml,
  });

  return {
    source: "matchcut_pending",
    html,
    thumbnailUrl: fallbackImage,
    imageUrls: fallbackImage ? [fallbackImage] : undefined,
    sellingPoints,
    searchKeywords,
    matchcutReady: false,
    matchcutNote: detail.note,
    detailProvider: detail.provider,
  };
}
