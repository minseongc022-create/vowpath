/**
 * 등록된 상품을 운영 두뇌가 읽을 수 있는 형태로 바꾼다
 *
 * ★ 두 곳에서 모아야 한다
 *
 *  · 토스 — 지금 실제로 걸려 있는 가격과 옵션 ID. 사장님이 셀러센터에서
 *    직접 바꿨을 수 있으므로 **우리 기록이 아니라 토스가 정답**이다.
 *  · 우리 초안 — 원가와 등록 시각. 토스는 우리가 얼마에 떼 왔는지 모른다.
 *
 * 둘 중 하나라도 없으면 가격을 만지지 않는다. 원가 없이 내리면 얼마에서
 * 손해로 바뀌는지 모른 채 내리는 것이고, 옵션 ID 없이는 아예 못 만진다.
 */

import type { JarvisListingDraft, MerchantData } from "../types";
import type { ListedSku } from "./store-operations";

export const LISTED_SKU_READER_VERSION = "1.0";

/** 토스에서 읽어 온 옵션의 현재 상태 */
export type LiveItem = {
  productId: number;
  itemId: number;
  itemName: string;
  salePrice: number;
  originPrice: number;
};

/**
 * 판매 실적을 발주함에서 읽는다.
 *
 * 토스 주문 목록이 정답이지만, 자비스는 이미 감지한 주문을 발주함에
 * 쌓아두고 있다. 그걸 쓰면 추가 API 호출 없이 "이 상품이 최근에 팔렸나"를
 * 알 수 있다. 취소된 건은 판매로 세지 않는다 — 취소를 판매로 세면 안 팔리는
 * 상품이 팔리는 것처럼 보여서 가격 인하가 영영 안 걸린다.
 */
function salesByProductName(data: MerchantData, nowMs: number) {
  const THIRTY_DAYS = 30 * 86_400_000;
  const map = new Map<string, { units: number; lastSoldAt?: string }>();

  for (const job of data.fulfillmentJobs ?? []) {
    if (job.status === "cancelled") continue;
    const t = Date.parse(job.createdAt);
    if (!Number.isFinite(t) || nowMs - t > THIRTY_DAYS) continue;

    const prev = map.get(job.productName) ?? { units: 0 };
    prev.units += job.quantity || 1;
    if (!prev.lastSoldAt || job.createdAt > prev.lastSoldAt) prev.lastSoldAt = job.createdAt;
    map.set(job.productName, prev);
  }
  return map;
}

function publishedDrafts(data: MerchantData): JarvisListingDraft[] {
  return (data.listingDrafts ?? []).filter(
    (d) => d.status === "published" && d.tossProductId != null,
  );
}

/**
 * 운영 대상 목록을 만든다.
 *
 * `live`를 넘기면 토스의 현재 가격·옵션 ID를 쓴다. 안 넘기면 초안에 기록된
 * 값으로 대신하는데, 그 경우 옵션 ID가 없으면 목록에서 빠진다 — 만질 수 없는
 * 상품을 계획에 넣어봐야 실패만 쌓인다.
 */
export function buildListedSkus(
  data: MerchantData,
  live?: LiveItem[],
  nowMs: number = Date.now(),
): ListedSku[] {
  const sales = salesByProductName(data, nowMs);
  const liveByProduct = new Map<number, LiveItem>();
  for (const item of live ?? []) {
    // 대표 옵션 하나만 다룬다. 옵션마다 다른 가격을 굴리면 어떤 변경이
    // 효과였는지 못 읽고, 위탁 상품은 대개 옵션이 하나다.
    if (!liveByProduct.has(item.productId)) liveByProduct.set(item.productId, item);
  }

  const out: ListedSku[] = [];
  for (const d of publishedDrafts(data)) {
    const productId = d.tossProductId!;
    const item = liveByProduct.get(productId);
    const productItemId = item?.itemId ?? d.tossProductItemId;
    if (productItemId == null) continue;

    const name = d.listingPayload.name;
    const sale = sales.get(name);

    out.push({
      productId,
      productItemId,
      name,
      // 토스가 정답이다 — 사장님이 직접 바꿨을 수 있다
      salePriceKrw: item?.salePrice ?? d.listingPayload.salePrice,
      originPriceKrw: item?.originPrice ?? d.listingPayload.originPrice,
      landedCostKrw: d.landedCostKrw,
      listedAt: d.publishedAt ?? d.createdAt,
      lastSoldAt: sale?.lastSoldAt,
      unitsSold30d: sale?.units ?? 0,
      lastPriceChangeAt: d.lastPriceChangeAt,
      hidden: Boolean(d.hiddenAt),
    });
  }
  return out;
}
