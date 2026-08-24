import { tossApiPost } from "./client";
import type { TossApiConfig } from "./config";
import type { JarvisListingDraft } from "../types";
import {
  isReturnLocationResolved,
  resolveReturnLocation,
  type ReturnLocationDecision,
} from "./exchange-return-location";
import { isCategoryResolved, resolveCategoryId, type CategoryDecision } from "./category-resolver";

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

export function buildTossCreatePayload(
  draft: JarvisListingDraft,
  categoryId: number,
  exchangeReturnLocationId: number,
  imageUrl?: string,
): TossCreateProductBody {
  const p = draft.listingPayload;
  const deliveryFree = p.deliveryFeeType === "FREE";

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
      jejuDeliveryFee: deliveryFree ? 0 : 3000,
      islandsMountainsDeliveryFee: deliveryFree ? 0 : 5000,
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

  const category = resolveCategoryId({
    category: payload.category,
    explicitCategoryId: input.categoryId,
  });
  const returnLocation = resolveReturnLocation({
    explicitLocationId: input.exchangeReturnLocationId,
    supplierPlatform: payload.supplierPlatform,
    supplierId: payload.supplierId,
    pickMode: input.draft.pickMode,
    strict: input.strictReturnLocation,
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

  if (!isReturnLocationResolved(returnLocation)) {
    // 매핑 오류(MAP_INVALID)·STRICT 누락(UNMAPPED)은 설정을 고쳐야 하는 문제라
    // simulated로 되돌려 초안을 approved 상태로 남긴다. 고친 뒤 재실행하면 된다.
    return {
      ok: false,
      simulated: true,
      returnLocation,
      category,
      error: returnLocation.error?.message ?? "교환·반품지 결정 실패",
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
