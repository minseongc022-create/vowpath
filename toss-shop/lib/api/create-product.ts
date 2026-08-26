import { tossApiPost } from "./client";
import type { TossApiConfig } from "./config";
import type { JarvisListingDraft } from "../types";
import {
  isReturnLocationResolved,
  resolveReturnLocation,
  type ReturnLocationDecision,
} from "./exchange-return-location";
import { isCategoryResolved, resolveCategoryId, type CategoryDecision } from "./category-resolver";
import { autoMatchCategoryId } from "./category-auto-match";
import { CATEGORY_RESOLVER_VERSION } from "./category-resolver";
import {
  buildNoticeItems,
  buildStockOptions,
  fetchCategorySalesOptions,
  fetchNoticeCategoryCodes,
  fetchNoticeItems,
  pickNoticeCategoryCode,
} from "./product-requirements";

/** Minimal Toss FEP product create body — categoryId required at publish time. */
export type TossCreateProductBody = {
  name: string;
  brandName: string;
  categoryId: number;
  stocks: Array<{
    /** 필수 — 구매옵션. 카테고리가 정한 필수 옵션을 채워야 한다 */
    options: Array<{ groupName: string; valueName: string }>;
    remainingCount: number;
    isHide: boolean;
    isMainPrice: boolean;
    isSoldOut: boolean;
    originPrice: number;
    salePrice: number;
    isPurchasableAlone: boolean;
  }>;
  images: Array<{ type: "THUMBNAIL" | "DESCRIPTION" | "DESCRIPTION_HTML"; url?: string; order: string }>;
  exposure: { searchKeywords: string[]; description: string };
  isTaxFree: boolean;
  deliveryPolicy: {
    deliveryMethod: "NORMAL";
    deliveryFeeType: "FREE" | "PAID" | "CONDITIONALLY_FREE";
    deliveryType: "NORMAL";
    minimumPurchasePrice: number;
    deliveryFee: number;
    isJejuAndIslandsMountainsDelivery: boolean;
    jejuDeliveryFee: number;
    islandsMountainsDeliveryFee: number;
  };
  exchangeReturnPolicy: {
    exchangeRefundLocationId: number;
    /** 필수 — 반품 편도 배송비 */
    refundOneWayDeliveryFee: number;
    /** 필수 — 교환 왕복 배송비 */
    exchangeRoundTripDeliveryFee: number;
    /** 필수 — 교환·환불 방법 설명 (500자 이내) */
    applicationMethodDescription: string;
    /** 필수 — 교환·환불 신청 가능 기간 설명 (500자 이내) */
    applicationTermDescription: string;
  };
  /** 필수 — 전자상거래법상 정보제공 고시 */
  notice: {
    categoryCode: string;
    items: Array<{ id: number; content: string }>;
  };
};

/**
 * 도서산간 추가비 기본값 — 공급처 안내에서 금액을 못 읽었을 때만 쓴다.
 *
 * 국내 도매 공급처의 제주·도서 추가비는 보통 이 선 안쪽이다. 여기를 낮게 잡으면
 * 해당 지역 주문마다 차액이 셀러 손실로 남으므로, 모를 때는 넉넉히 잡는다.
 */
const DEFAULT_JEJU_FEE_KRW = 3_000;
const DEFAULT_ISLAND_FEE_KRW = 5_000;

/**
 * 등록에 실을 이미지 목록을 만든다 — url이 있는 항목만.
 *
 * 첫 장은 썸네일, 나머지는 상세 이미지가 된다. 중복은 뺀다 (같은 사진이
 * 썸네일과 상세에 겹쳐 들어가면 상세가 한 장짜리로 보인다).
 */
export function buildImageList(
  thumbnailUrl: string | undefined,
  detailUrls: string[] | undefined,
): Array<{ type: "THUMBNAIL" | "DESCRIPTION" | "DESCRIPTION_HTML"; url?: string; order: string }> {
  const images: Array<{ type: "THUMBNAIL" | "DESCRIPTION"; url: string; order: string }> = [];
  const seen = new Set<string>();

  const push = (type: "THUMBNAIL" | "DESCRIPTION", url: string) => {
    const clean = url.trim();
    // 255자 제한을 넘는 주소는 토스가 거절한다 — 넣지 않는다
    if (!clean || clean.length > 255 || seen.has(clean)) return;
    seen.add(clean);
    images.push({ type, url: clean, order: String(images.length) });
  };

  const details = (detailUrls ?? []).filter(Boolean);
  if (thumbnailUrl) push("THUMBNAIL", thumbnailUrl);
  else if (details.length) push("THUMBNAIL", details[0]);

  for (const u of details) push("DESCRIPTION", u);

  // 상세가 한 장도 없으면 썸네일을 상세로도 쓴다 — 토스는 상세를 요구한다.
  if (images.length === 1 && images[0].type === "THUMBNAIL") {
    images.push({ type: "DESCRIPTION", url: images[0].url, order: "1" });
  }
  return images;
}

export function buildTossCreatePayload(
  draft: JarvisListingDraft,
  categoryId: number,
  exchangeReturnLocationId: number,
  imageUrl?: string,
  /**
   * 카테고리마다 다른 필수 부속 정보. 등록 직전에 토스에서 조회해 넘긴다 —
   * 상수로 박을 수 없는 값들이라 여기로 주입받는다.
   */
  requirements?: {
    stockOptions: Array<{ groupName: string; valueName: string }>;
    notice: { categoryCode: string; items: Array<{ id: number; content: string }> };
  },
): TossCreateProductBody {
  const p = draft.listingPayload;
  const deliveryFree = p.deliveryFeeType === "FREE";

  // 도서산간 추가비를 실제보다 낮게 걸면 제주·도서 주문마다 차액을 셀러가 문다.
  // 공급처 안내에서 실제 금액을 읽어냈으면 그 값을 쓰고, 못 읽었으면 보수적
  // 기본값을 쓴다 — 과소 계상은 매 건 손실이지만 과대 계상은 기회 손실에 그친다.
  const readSurcharge = p.supplierPolicy?.measured.remoteSurcharge
    ? p.supplierPolicy.remoteAreaSurchargeKrw
    : 0;
  const jejuFee = deliveryFree ? 0 : Math.max(DEFAULT_JEJU_FEE_KRW, readSurcharge);
  const islandFee = deliveryFree ? 0 : Math.max(DEFAULT_ISLAND_FEE_KRW, readSurcharge);

  return {
    name: p.name,
    brandName: p.brandName,
    categoryId,
    stocks: [
      {
        options: requirements?.stockOptions ?? [],
        remainingCount: 99,
        isHide: false,
        isMainPrice: true,
        isSoldOut: false,
        originPrice: p.originPrice,
        salePrice: p.salePrice,
        isPurchasableAlone: true,
      },
    ],
    // ★ 이미지는 **실제 URL이 있는 것만** 넣는다
    //
    // 종전엔 url 없는 DESCRIPTION_HTML 항목을 넣었다. 토스는 그걸 보고
    // "상세 이미지 또는 html을 찾을 수 없음"으로 등록을 거절했다 — 당연하다,
    // 가리키는 게 아무것도 없으니까. (url은 255자 제한이라 HTML 본문을
    // 인라인으로 넣을 수도 없다. 실제 이미지 주소를 줘야 한다.)
    //
    // 그래서 썸네일과 상세 이미지를 실사진 URL로 채운다. 생성 이미지가
    // 있으면 그걸 쓰고, 없으면 공급처 실사진을 쓴다.
    images: buildImageList(imageUrl, draft.detailPage?.imageUrls),
    exposure: {
      searchKeywords: p.searchKeywords.length ? p.searchKeywords : [draft.keyword.slice(0, 10)],
      description: p.description.slice(0, 1500),
    },
    isTaxFree: false,
    deliveryPolicy: {
      deliveryMethod: "NORMAL",
      deliveryFeeType: p.deliveryFeeType,
      deliveryType: "NORMAL",
      minimumPurchasePrice: deliveryFree ? 0 : 15000,
      deliveryFee: deliveryFree ? 0 : 2500,
      isJejuAndIslandsMountainsDelivery: true,
      jejuDeliveryFee: jejuFee,
      islandsMountainsDeliveryFee: islandFee,
    },
    exchangeReturnPolicy: {
      exchangeRefundLocationId: exchangeReturnLocationId,
      // 공급처 안내에서 읽어낸 실제 금액을 쓴다. 못 읽었으면 판독기의
      // 보수적 기본값이 들어와 있다 — 과소 계상은 매 건 셀러 손실이다.
      refundOneWayDeliveryFee: p.supplierPolicy?.returnShippingKrw ?? 3000,
      exchangeRoundTripDeliveryFee: p.supplierPolicy?.exchangeShippingKrw ?? 6000,
      applicationMethodDescription:
        "판매자 고객센터로 교환·반품을 신청해 주세요. 상품 수령 후 7일 이내 신청 가능하며, " +
        "단순 변심의 경우 왕복 배송비가 부과됩니다. 상품 하자·오배송은 판매자가 부담합니다.",
      applicationTermDescription:
        "상품 수령일로부터 7일 이내 (전자상거래법 제17조). 상품 하자 또는 표시·광고와 다른 경우 " +
        "수령일로부터 3개월 이내, 그 사실을 안 날로부터 30일 이내 신청 가능합니다.",
    },
    notice: requirements?.notice ?? { categoryCode: "", items: [] },
  };
}

export type PublishListingResult = {
  ok: boolean;
  productId?: number;
  error?: string;
  simulated?: boolean;
  /** 등록에 사용된 반품지 결정 근거 — 초안에 기록해 사후 추적에 쓴다 */
  returnLocation?: ReturnLocationDecision;
  /** 등록에 사용된 카테고리 결정 근거 */
  category?: CategoryDecision;
};

export async function publishListingToToss(input: {
  merchantId: string;
  config: TossApiConfig;
  draft: JarvisListingDraft;
  categoryId?: number;
  exchangeReturnLocationId?: number;
  imageUrl?: string;
  /** 무인 자동등록 경로 — 반품지 매핑 누락을 경고가 아닌 차단으로 처리 */
  strictReturnLocation?: boolean;
}): Promise<PublishListingResult> {
  const payload = input.draft.listingPayload;
  // 썸네일은 초안이 이미 들고 있다. 호출부가 따로 넘겨주기만 기다리면,
  // 한 곳이라도 안 넘기는 순간 이미지 없는 상품이 되어 등록이 거절된다.
  const thumbnailUrl = input.imageUrl ?? input.draft.detailPage?.thumbnailUrl;

  // ★ 순서: 값싼 판정 먼저, 비싼 조회 나중
  //
  // 반품지 결정은 설정만 보는 국소 판정이라 즉시 끝나고, 실패하면 등록
  // 자체가 불가능하다. 반면 카테고리 자동 매칭은 토스 트리를 여러 단계
  // 내려가며 조회하고 단계마다 AI를 부른다. 비싼 쪽을 먼저 하면, 어차피
  // 반품지에서 막힐 건에 매번 그 비용을 태우게 된다.
  const returnLocation = resolveReturnLocation({
    // 사람이 승인 화면에서 지정한 값이 최우선. 없으면 반품 물류 두뇌가
    // 공급처 주소를 대조해 확정해둔 값을 쓴다 — 매핑 JSON 없이도 맞게 걸린다.
    explicitLocationId: input.exchangeReturnLocationId ?? payload.resolvedReturnLocationId,
    supplierPlatform: payload.supplierPlatform,
    supplierId: payload.supplierId,
    pickMode: input.draft.pickMode,
    strict: input.strictReturnLocation,
    returnHandling: payload.returnHandling,
  });

  if (!isReturnLocationResolved(returnLocation)) {
    // 매핑 오류(MAP_INVALID)·STRICT 누락(UNMAPPED)은 설정을 고쳐야 하는 문제라
    // simulated로 되돌려 초안을 approved 상태로 남긴다. 고친 뒤 재실행하면 된다.
    //
    // 여기서 끊기면 카테고리 조회는 시작도 안 했다 — 그게 이 순서의 목적이다.
    return {
      ok: false,
      simulated: true,
      returnLocation,
      category: { engineVersion: CATEGORY_RESOLVER_VERSION, warnings: [], source: "unresolved" },
      error: returnLocation.error?.message ?? "교환·반품지 결정 실패",
    };
  }

  // 반품지가 확정된 뒤에야 카테고리를 찾는다. 명시 지정이 없으면 이 상품에
  // 맞는 실제 리프 카테고리를 트리에서 내려가며 찾고, 실패하면 정적 매핑·
  // 기본값으로 폴백한다 — category-resolver.ts가 그 폴백을 담당한다.
  let autoMatch: { categoryId: number; path: string[] } | undefined;
  // 자동 매칭이 왜 실패했는지 들고 다닌다. 종전엔 버렸는데, 그러면 등록이
  // 막혔을 때 "카테고리 ID가 없다"까지만 알고 그 앞단이 키가 없어서인지,
  // 트리 조회가 실패해서인지, 확신을 못 해서인지 알 길이 없다.
  let autoMatchReason: string | undefined;
  if (!input.categoryId) {
    const matched = await autoMatchCategoryId({
      merchantId: input.merchantId,
      config: input.config,
      title: payload.name,
      keyword: input.draft.keyword,
      category: payload.category,
    });
    if (matched.confident && matched.categoryId) {
      autoMatch = { categoryId: matched.categoryId, path: matched.path };
    } else {
      autoMatchReason = matched.reason;
    }
  }

  const category = resolveCategoryId({
    category: payload.category,
    explicitCategoryId: input.categoryId,
    autoMatch,
    autoMatchReason,
  });

  if (!isCategoryResolved(category)) {
    return {
      ok: false,
      simulated: true,
      returnLocation,
      category,
      error: category.error?.message ?? "토스 카테고리 결정 실패",
    };
  }

  // 카테고리가 정한 필수 부속 정보를 등록 직전에 조회한다.
  //
  // 이게 없어서 토스가 `{"stocks":"필수 값이 누락되었습니다."}`로 거절했다.
  // 구매옵션과 정보제공 고시는 카테고리마다 항목이 달라 상수로 못 박는다.
  let requirements:
    | {
        stockOptions: Array<{ groupName: string; valueName: string }>;
        notice: { categoryCode: string; items: Array<{ id: number; content: string }> };
      }
    | undefined;
  try {
    const template = await fetchCategorySalesOptions(
      input.merchantId,
      input.config,
      category.categoryId,
    );
    const built = buildStockOptions(template, { name: payload.name });
    if ("blocked" in built) {
      // 필수 옵션에 치수 같은 숫자를 요구하는데 우리가 모르는 경우다.
      // 지어내면 반품·분쟁으로 돌아오므로 등록을 멈춘다.
      return {
        ok: false,
        simulated: true,
        returnLocation,
        category,
        error: built.blocked,
      };
    }

    const codes = await fetchNoticeCategoryCodes(input.merchantId, input.config);
    const noticeCode = pickNoticeCategoryCode(codes, payload.category);
    if (!noticeCode) {
      return {
        ok: false,
        simulated: true,
        returnLocation,
        category,
        error:
          "정보제공 고시 카테고리를 정하지 못했습니다 — 법정 의무 표시사항이라 " +
          "임의로 넣지 않고 등록을 멈춥니다.",
      };
    }
    const noticeItems = await fetchNoticeItems(input.merchantId, input.config, noticeCode);
    requirements = {
      stockOptions: built.options,
      notice: {
        categoryCode: noticeCode,
        items: buildNoticeItems(noticeItems, {
          productName: payload.name,
          brandName: payload.brandName,
        }),
      },
    };
  } catch (e) {
    return {
      ok: false,
      simulated: true,
      returnLocation,
      category,
      error: `등록 필수 정보 조회 실패 — ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
    };
  }

  // 이미지가 하나도 없으면 토스가 거절한다. 보내보고 거절당하느니
  // 여기서 멈추고 사유를 남긴다 — 초안은 approved로 남아 재실행된다.
  if (buildImageList(thumbnailUrl, input.draft.detailPage?.imageUrls).length === 0) {
    return {
      ok: false,
      simulated: true,
      returnLocation,
      category,
      error:
        "상품 이미지가 없어 등록할 수 없습니다 — 공급처 사진도 상세 생성 이미지도 " +
        "확보되지 않았습니다.",
    };
  }

  const body = buildTossCreatePayload(
    input.draft,
    category.categoryId,
    returnLocation.locationId,
    thumbnailUrl,
    requirements,
  );

  try {
    const res = await tossApiPost<{ id?: number; productId?: number }>(
      input.merchantId,
      input.config,
      "/api/v3/shopping-fep/products/v2",
      body,
    );

    if (res.resultType === "FAIL") {
      return {
        ok: false,
        returnLocation,
        category,
        error: res.error?.reason ?? res.error?.errorCode ?? "TOSS_CREATE_FAIL",
      };
    }

    const productId = res.success?.id ?? res.success?.productId;
    return {
      ok: true,
      returnLocation,
      category,
      productId: productId != null ? Number(productId) : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      returnLocation,
      category,
      error: e instanceof Error ? e.message : "TOSS_PUBLISH_ERROR",
    };
  }
}
