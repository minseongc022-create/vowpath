import { tossApiGet } from "./client";
import type { TossApiConfig } from "./config";

export type TossProductListItem = {
  id: number;
  name: string;
  salePrice: number;
  regTs?: string;
  exposureStatus?: string;
  inspectionStatus?: string;
  images?: Array<{ url?: string }>;
};

export type TossProductDetail = {
  id: number;
  name: string;
  merchantId?: number;
  brandName?: string;
  exposure?: { searchKeywords?: string[]; description?: string };
  stocks?: Array<{ salePrice?: number; originPrice?: number; quantity?: number }>;
  categoryName?: string;
};

export async function listAllProducts(
  merchantId: string,
  config: TossApiConfig,
): Promise<TossProductListItem[]> {
  const items: TossProductListItem[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < 20; page++) {
    const res = await tossApiGet<{
      products: TossProductListItem[];
      hasNext: boolean;
      nextToken?: string;
    }>(merchantId, config, "/api/v3/shopping-fep/products/v2", {
      size: 100,
      nextToken,
      partnerName: config.partnerName,
    });

    if (res.resultType === "FAIL") {
      throw new Error(res.error?.reason ?? res.error?.errorCode ?? "LIST_PRODUCTS_FAIL");
    }

    items.push(...(res.success?.products ?? []));
    if (!res.success?.hasNext || !res.success.nextToken) break;
    nextToken = res.success.nextToken;
  }

  return items;
}

export async function getProductDetail(
  merchantId: string,
  config: TossApiConfig,
  productId: number | string,
): Promise<TossProductDetail | null> {
  const res = await tossApiGet<TossProductDetail>(
    merchantId,
    config,
    `/api/v3/shopping-fep/products/${productId}/v2`,
    { partnerName: config.partnerName },
  );
  if (res.resultType === "FAIL") return null;
  return res.success ?? null;
}
