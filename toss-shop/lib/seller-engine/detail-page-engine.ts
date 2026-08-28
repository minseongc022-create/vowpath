/**
 * Jarvis AI 상세페이지 생성 (Hookable-class)
 *
 * Matchcut 어댑터 → Hookable 템플릿 또는 1688 비전 파이프라인.
 * 상위셀러 전술(차별화·롱테일·셀링포인트 상단) 반영.
 */

import type { ConsignmentPick, ImportPick, JarvisDetailPageBundle } from "../types";
import { requestDetailPageFromProviders } from "./detail-page-providers";
import type { DetailPageProviderId } from "./detail-page-providers";
import { fetchWholesaleProductImages } from "./wholesale-image-fetch";
import { generateDetailShots } from "./image-detail-shots";
import { buildPersuasionPlan, renderObjectionsHtml, type PersuasionPlan } from "./buyer-psychology";
import { buildDetailPageHtml } from "./detail-page-html";
import { planDetailSections } from "./detail-section-plan";
import { renderSectionPlanHtml, SECTION_DETAIL_HTML_VERSION } from "./section-detail-html";
import { buildProductShotSet, type ProductShot } from "./product-shot-set";
import { aiImagesEnabled } from "./ai-image-studio";
import { meetsSupplierPolicy } from "../wholesale/supplier-quality";
import { polishSellingCopy } from "./copy-polish";

export const DETAIL_PAGE_ENGINE_VERSION = "3.0";

function mapProviderToSource(provider: DetailPageProviderId): JarvisDetailPageBundle["source"] {
  if (provider === "matchcut_pipeline") return "matchcut";
  if (provider === "openai_premium") return "openai_premium";
  if (provider === "manual_import") return "manual_import";
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

/** 이 미만이면 "사진이 별로 없다"고 보고 클로즈업 컷을 더 만든다 */
const THIN_GALLERY_THRESHOLD = 4;

/**
 * 실제 상품 사진을 최대한 모은다 — 지어낸 이미지는 절대 안 넣는다.
 *
 * 우선순위:
 *  1. 상세 조회(getItemView) JSON에서 스캔한 갤러리 — `wholesale.detailImageUrls`.
 *     domeggook-detail.ts가 응답 전체를 읽어 실제 이미지 URL을 모은 것이다.
 *  2. 부족하면 상품 상세페이지 자체를 가볍게 스크랩해 보충한다
 *     (`fetchWholesaleProductImages`) — 이것도 실제 <img> 태그를 그대로
 *     읽는 것이지 AI가 만들어내는 게 아니다. 비용이 안 든다(순수 fetch).
 *  3. 그래도 사진이 적으면(공급처가 성의 없이 1~2장만 올린 경우) 있는
 *     실사진을 **잘라서** 클로즈업 컷을 만든다(image-detail-shots.ts).
 *     새로 그리는 게 아니라 같은 사진의 다른 영역을 확대하는 것이라
 *     100% 실물이다 — "다른 상품처럼 보일" 위험이 구조적으로 없다.
 *  4. 그래도 아무것도 없으면 검색 결과 썸네일 1장.
 *
 * 어떤 단계에서도 배경을 새로 그리거나 없는 각도를 지어내지 않는다 —
 * 실물과 다르게 보이면 반품·분쟁으로 돌아온다.
 */
async function collectRealImages(
  productUrl: string | undefined,
  primaryImageUrl: string | undefined,
  knownGallery: string[] | undefined,
): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (u?: string) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  };

  for (const u of knownGallery ?? []) add(u);

  if (out.length < THIN_GALLERY_THRESHOLD && (productUrl || primaryImageUrl)) {
    try {
      const scraped = await fetchWholesaleProductImages({
        productUrl,
        primaryImageUrl,
        maxImages: 10,
      });
      for (const u of scraped) add(u);
    } catch {
      // 스크랩 실패는 무시한다 — 이미 있는 이미지만으로도 등록은 가능하다
    }
  }

  if (out.length === 0) add(primaryImageUrl);

  // 사장님 지시: "공급처에서 제공하는 사진이 별로 없으면 우리가 더 만들어서"
  // — 단, 안 보이는 곳을 지어내지 않고 보이는 곳을 다른 프레임으로만 보여준다.
  if (out.length > 0 && out.length < THIN_GALLERY_THRESHOLD) {
    try {
      const need = THIN_GALLERY_THRESHOLD - out.length;
      const shots = await generateDetailShots(out[0], Math.min(3, need + 1));
      for (const u of shots) {
        if (out.length >= THIN_GALLERY_THRESHOLD) break;
        add(u);
      }
    } catch {
      // 실패해도 있는 실사진만으로 진행한다 — 지어낼 수는 없다
    }
  }

  return out;
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

  // ★ 위탁(consignment)은 AI가 통짜로 그려주는 HTML을 쓰지 않는다
  //
  // 예전엔 여기서 requestDetailPageFromProviders를 부르고, 성공하면(AI가
  // 통짜 HTML을 돌려주면) 그 결과를 그대로 썼다. 그런데 그 경로 중
  // openai_premium은 **배경을 AI로 재구성**하는 기능이 있다 — 이건
  // "모습이 변형되거나 다른 상품처럼 보이면 안 된다"는 지시와 정면으로
  // 부딪힌다. 게다가 레이아웃도 그때그때 AI가 알아서 짜는 것이라, 우리가
  // 설계한 "사진+문구" 구조가 지켜진다는 보장이 없었다 — 실제로 크레딧을
  // 충전하자 이 경로가 되살아나면서 새로 만든 레이아웃이 통째로 무시됐다.
  //
  // 그 원칙은 그대로 지킨다: **레이아웃은 항상 코드가 정한다.** AI는 그
  // 안에서 두 가지에만 관여한다 — 사진(허용된 범위 안에서 다시 조명한
  // 컷)과 문장(사실은 그대로, 표현만). 둘 다 실패하면 조용히 원래 방식으로
  // 폴백하므로, 후커블 급으로 안 올라가는 것과 상세페이지 생성 자체가
  // 막히는 것은 다른 문제로 다룬다.
  if (mode === "consignment") {
    const baseImages = await collectRealImages(
      wholesale?.url,
      wholesale?.imageUrl,
      wholesale?.detailImageUrls,
    );

    // 사진 보강 — product-shot-set은 "원본에 보이는 면만 유지"를 프롬프트에
    // 강제한 파이프라인이다(뒷면·반대편 지어내기 금지). 배경 재구성 사고가
    // 났던 경로(자유 배경+통짜 HTML 생성)와는 다른, 더 좁고 검증된 경로다.
    // 실패하면 원본 사진만으로 계속 진행한다.
    let shots: ProductShot[] = [];
    if (baseImages.length && aiImagesEnabled()) {
      try {
        const shotSet = await buildProductShotSet({
          imageUrl: baseImages[0],
          category: pick.category,
          productLabel: title,
        });
        shots = shotSet.shots;
      } catch {
        shots = [];
      }
    }

    // 문장 다듬기 — 사실(숫자·핵심 단어)은 검증 통과해야만 채택한다.
    // 실패하면 buyer-psychology가 만든 원문 그대로 쓴다.
    const polish = await polishSellingCopy(sellingPoints);
    const finalPoints = polish.points;

    const sameDayVerified = meetsSupplierPolicy(wholesale?.supplierQuality);
    const deliveryNote = sameDayVerified
      ? "평일 기준 당일 출고됩니다. (주문 마감 시간 이후 접수 건은 다음 영업일 출고)"
      : "결제 확인 후 순차 발송됩니다.";

    // 생성 컷이 있으면 그걸 먼저 쓰고, 없으면 실사진 그대로.
    const generatedUrls = shots.map((s) => s.url);
    const displayImages = generatedUrls.length ? [...generatedUrls, ...baseImages] : baseImages;

    // ★ 섹션 구성은 후커블·드랩이 쓰는 구조를 따른다 (detail-section-plan 참조):
    //   문제 제기 → 솔루션 → 기능 → 사회적 증거 → 정보 → 보증 → FAQ
    // 다만 **근거가 있는 섹션만** 만든다. 그들은 리뷰가 없으면 지어내지만
    // 우리는 없으면 섹션을 뺀다 — 위탁은 실물 검증이 불가능해서 지어낸
    // 사회적 증거가 곧 기만적 표시가 되기 때문이다.
    const sectionPlan = planDetailSections({
      title,
      category: pick.category,
      sellingPoints: finalPoints,
      imageUrls: displayImages,
      objections: plan.objections,
      deliveryNote,
      returnNote,
      proof: { verifiedFastShipping: sameDayVerified },
    });

    const finalHtml = renderSectionPlanHtml(sectionPlan, {
      title,
      category: pick.category,
    });

    return {
      source: "jarvis_ai",
      html: finalHtml,
      thumbnailUrl: displayImages[0],
      imageUrls: displayImages.length ? displayImages : undefined,
      sellingPoints: finalPoints,
      searchKeywords,
      matchcutReady: false,
      layoutVersion: SECTION_DETAIL_HTML_VERSION,
    };
  }

  const detail = await requestDetailPageFromProviders({
    listingUrl: importUrl,
    referenceImageUrl: importImage,
    keyword: pick.keyword,
    productName: pick.productName,
    pick,
    mode,
    sellingPoints,
    generateAngles: Boolean(importUrl?.includes("1688")),
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

  // AI 생성이 실패해도 참조 이미지는 남긴다 — 없는 것보다 낫다.
  const fallbackImage = importImage;
  const allImages = fallbackImage ? [fallbackImage] : [];
  const html = buildDetailPageHtml({
    productName: title,
    sellingPoints,
    imageUrls: allImages,
    returnNote,
    objections: plan.objections,
  });

  return {
    source: "matchcut_pending",
    html,
    thumbnailUrl: fallbackImage,
    imageUrls: allImages.length ? allImages : undefined,
    sellingPoints,
    searchKeywords,
    matchcutReady: false,
    matchcutNote: detail.note,
    detailProvider: detail.provider,
  };
}
