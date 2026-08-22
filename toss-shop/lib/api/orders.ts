import { tossApiGet, tossApiPut } from "./client";
import type { TossApiConfig } from "./config";

export type TossOrderProduct = {
  orderId: number;
  orderProductId: number;
  productId: number;
  productName: string;
  orderProductStatus: string;
  orderedAt: string;
  quantity: number;
  price: number;
  receiverName: string;
  receiverPhone: string;
  ordererName: string;
  ordererPhone: string;
  address: string;
  detailAddress: string;
  zipCode: string;
  optionName?: string;
  deliveryCompanyCode?: string;
  shippingTrackingNumber?: string;
};

export function orderDateRange(days = 7): { startDate: string; endDate: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return {
    startDate: from.toISOString().slice(0, 10),
    endDate: to.toISOString().slice(0, 10),
  };
}

export async function listRecentOrders(
  merchantId: string,
  config: TossApiConfig,
  days = 7,
): Promise<TossOrderProduct[]> {
  const { startDate, endDate } = orderDateRange(days);
  const rows: TossOrderProduct[] = [];
  let nextCursor: string | undefined;

  for (let page = 0; page < 20; page++) {
    const res = await tossApiGet<{
      results: TossOrderProduct[];
      nextCursor?: string | null;
    }>(merchantId, config, "/api/v3/shopping-fep/orders/v2", {
      startDate,
      endDate,
      nextCursor,
      partnerName: config.partnerName,
    });

    if (res.resultType === "FAIL") {
      throw new Error(res.error?.reason ?? res.error?.errorCode ?? "ORDER_FETCH_FAIL");
    }

    rows.push(...(res.success?.results ?? []));
    nextCursor = res.success?.nextCursor ?? undefined;
    if (!nextCursor) break;
  }

  return rows;
}

export async function markOrderPreparing(
  merchantId: string,
  config: TossApiConfig,
  orderProductIds: number[],
): Promise<boolean> {
  const res = await tossApiPut<unknown>(
    merchantId,
    config,
    "/api/v3/shopping-fep/orders/products/status",
    { orderProductIds, status: "PREPARING_PRODUCT" },
  );
  return res.resultType === "SUCCESS";
}

export async function registerOrderTracking(
  merchantId: string,
  config: TossApiConfig,
  input: {
    orderProductId: number;
    deliveryCompany: string;
    trackingNumber: string;
  },
): Promise<boolean> {
  const res = await tossApiPut<unknown>(
    merchantId,
    config,
    "/api/v3/shopping-fep/orders/products/delivery",
    {
      orderProductId: input.orderProductId,
      deliveryCompany: input.deliveryCompany,
      trackingNumber: input.trackingNumber,
    },
  );
  return res.resultType === "SUCCESS";
}
