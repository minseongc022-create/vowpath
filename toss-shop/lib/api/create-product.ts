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

/** Minimal Toss FEP product create body — categoryId required at publish time. */
export type TossCreateProductBody = {
  name: string;
  brandName: string;
  categoryId: number;
  stocks: Array<{
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

export function buildTossCreatePayload(
  draft: JarvisListingDraft,
  categoryId: number,
  exchangeReturnLocationId: number,
  imageUrl?: string,
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
        remainingCount: 99,
        isHide: false,
        isMainPrice: true,
        isSoldOut: false,
        originPrice: p.originPrice,
        salePrice: p.salePrice,
        isPurchasableAlone: true,
      },
    ],
    images: imageUrl
      ? [
          { type: "THUMBNAIL", url: imageUrl, order: "0" },
          { type: "DESCRIPTION_HTML", order: "1" },
        ]
      : [{ type: "DESCRIPTION_HTML", order: "0" }],
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
    },
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

  const body = buildTossCreatePayload(
    input.draft,
    category.categoryId,
    returnLocation.locationId,
    input.imageUrl,
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
