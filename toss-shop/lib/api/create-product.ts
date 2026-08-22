import { tossApiPost } from "./client";
import type { TossApiConfig } from "./config";
import type { JarvisListingDraft } from "../types";

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
};

export async function publishListingToToss(input: {
  merchantId: string;
  config: TossApiConfig;
  draft: JarvisListingDraft;
  categoryId?: number;
  exchangeReturnLocationId?: number;
  imageUrl?: string;
}): Promise<PublishListingResult> {
  const categoryId = input.categoryId ?? parseInt(process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID ?? "0", 10);
  const returnId =
    input.exchangeReturnLocationId ??
    parseInt(process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID ?? "0", 10);

  if (!categoryId || !returnId) {
    return {
      ok: false,
      simulated: true,
      error:
        "토스 카테고리 ID·교환반품지 ID 필요 — Vercel에 TOSS_SHOP_DEFAULT_CATEGORY_ID, TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID 설정 또는 승인 시 입력",
    };
  }

  const body = buildTossCreatePayload(input.draft, categoryId, returnId, input.imageUrl);

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
        error: res.error?.reason ?? res.error?.errorCode ?? "TOSS_CREATE_FAIL",
      };
    }

    const productId = res.success?.id ?? res.success?.productId;
    return { ok: true, productId: productId != null ? Number(productId) : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "TOSS_PUBLISH_ERROR" };
  }
}
