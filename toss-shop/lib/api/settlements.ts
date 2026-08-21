import { tossApiGet } from "./client";
import type { TossApiConfig } from "./config";
import type { SettlementRow } from "../types";

export type TossSettlementItem = {
  orderId: number;
  orderProductId?: number | null;
  displayProductName: string;
  stockPrice?: number;
  orderProductPrice?: number;
  payFee?: number;
  productFee?: number;
  payVat?: number;
  productVat?: number;
  settlementAmount?: number;
  deliveryFeeAmount?: number;
  payoutDate?: string | null;
  payoutBaseDate?: string | null;
  confirmedAt?: string | null;
  transactionTs?: string;
  orderProductStatus?: string;
  stepType?: string;
};

function mapSettlementItem(item: TossSettlementItem): Omit<SettlementRow, "id" | "status"> | null {
  if (!item.orderProductId && item.displayProductName === "배송비") {
    return null;
  }
  const gross = item.orderProductPrice ?? item.stockPrice ?? 0;
  const platformFee =
    Math.abs(item.payFee ?? 0) +
    Math.abs(item.productFee ?? 0) +
    Math.abs(item.payVat ?? 0) +
    Math.abs(item.productVat ?? 0);
  const expected = item.settlementAmount ?? gross - platformFee;
  const orderDate =
    item.payoutBaseDate ??
    item.confirmedAt ??
    item.transactionTs?.slice(0, 10) ??
    new Date().toISOString().slice(0, 10);

  return {
    orderId: `TS-${item.orderId}-${item.orderProductId ?? "fee"}`,
    orderDate,
    productName: item.displayProductName,
    grossKrw: gross,
    platformFeeKrw: platformFee,
    shippingFeeKrw: Math.abs(item.deliveryFeeAmount ?? 0),
    expectedPayoutKrw: expected,
    purchaseConfirmedAt: item.confirmedAt ?? undefined,
    payoutDate: item.payoutDate ?? undefined,
  };
}

export async function fetchSettlementRows(
  merchantId: string,
  config: TossApiConfig,
  fromDate: string,
  toDate: string,
): Promise<Omit<SettlementRow, "id" | "status">[]> {
  const rows: Omit<SettlementRow, "id" | "status">[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < 50; page++) {
    const res = await tossApiGet<{
      items: TossSettlementItem[];
      nextToken?: string;
    }>(merchantId, config, "/api/v3/shopping-fep/settlement-steps", {
      dateCondition: "PAYOUT_BASE_DATE",
      fromDate,
      toDate,
      size: 100,
      nextToken,
      partnerName: config.partnerName,
    });

    if (res.resultType === "FAIL") {
      throw new Error(res.error?.reason ?? res.error?.errorCode ?? "SETTLEMENT_FETCH_FAIL");
    }

    for (const item of res.success?.items ?? []) {
      const mapped = mapSettlementItem(item);
      if (mapped) rows.push(mapped);
    }

    nextToken = res.success?.nextToken;
    if (!nextToken) break;
  }

  return rows;
}

/** Last 31 days of settlements (API max range). */
export function settlementDateRange(): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}
