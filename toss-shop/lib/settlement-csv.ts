import type { SettlementRow } from "./types";

export function parseSettlementCsv(text: string): Omit<SettlementRow, "id" | "status">[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const gross = Number(cols[idx("gross_krw")] ?? cols[idx("판매가")] ?? 0);
    const fee = Number(cols[idx("platform_fee_krw")] ?? cols[idx("수수료")] ?? Math.round(gross * 0.08));
    const shipping = Number(cols[idx("shipping_fee_krw")] ?? cols[idx("배송비")] ?? 0);
    return {
      orderId: cols[idx("order_id")] ?? cols[idx("주문번호")] ?? `ord_${Date.now()}`,
      orderDate: cols[idx("order_date")] ?? cols[idx("주문일")] ?? new Date().toISOString().slice(0, 10),
      productName: cols[idx("product_name")] ?? cols[idx("상품명")] ?? "상품",
      grossKrw: gross,
      platformFeeKrw: fee,
      shippingFeeKrw: shipping,
      expectedPayoutKrw: gross - fee,
      purchaseConfirmedAt: cols[idx("purchase_confirmed_at")] ?? undefined,
      payoutDate: cols[idx("payout_date")] ?? undefined,
    };
  });
}
