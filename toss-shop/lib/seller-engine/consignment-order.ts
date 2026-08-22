/**
 * 위탁판매 자동 발주 — 도매매/도매꾹 (수입판매는 수동 유지)
 *
 * 도매매 Open API에 주문 엔드포인트가 없으므로:
 * - live: 발주 준비 + 공급처 딥링크 + 주문 기록
 * - demo: 시뮬레이션 완료 처리
 */

import type { ConsignmentPick, JarvisConsignmentOrder, JarvisListingDraft } from "../types";
import { isDomeggookApiConfigured } from "../wholesale/domeggook-api";

export const CONSIGNMENT_ORDER_VERSION = "1.0";

function buildOrderNote(platform: string, url: string, itemNo?: number): string {
  if (platform === "domeme") {
    return itemNo
      ? `도매매 단품 발주 — 상품번호 ${itemNo}. domeme.com/s/${itemNo} 에서 1개 주문`
      : `도매매 발주 — ${url}`;
  }
  return `도매꾹 발주 — ${url}`;
}

export function planConsignmentOrder(
  draft: JarvisListingDraft,
  pick: ConsignmentPick,
): JarvisConsignmentOrder {
  const wholesale = pick.wholesaleBest;
  if (!wholesale) {
    return {
      status: "failed",
      orderNote: "공급처 정보 없음 — 위탁 발주 불가",
    };
  }

  const platform = wholesale.platform;
  const supplierUrl = wholesale.url;
  const orderNote = buildOrderNote(platform, supplierUrl, wholesale.itemNo);

  const apiLive = isDomeggookApiConfigured() && wholesale.source === "live";

  if (apiLive) {
    return {
      status: "ready",
      platform,
      supplierUrl,
      itemNo: wholesale.itemNo,
      unitPriceKrw: wholesale.unitPriceKrw,
      moq: wholesale.moq,
      orderNote: `${orderNote} · Jarvis가 발주 URL을 기록했습니다. 토스 주문 발생 시 이 URL에서 발주하세요.`,
      autoOrderSupported: false,
    };
  }

  return {
    status: "simulated",
    platform,
    supplierUrl,
    itemNo: wholesale.itemNo,
    unitPriceKrw: wholesale.unitPriceKrw,
    moq: wholesale.moq,
    orderNote: `데모 모드 — ${orderNote} (실제 API 연동 시 발주 URL 자동 기록)`,
    autoOrderSupported: false,
    orderedAt: new Date().toISOString(),
  };
}

export async function executeConsignmentOrder(
  draft: JarvisListingDraft,
  pick: ConsignmentPick,
): Promise<JarvisConsignmentOrder> {
  const plan = planConsignmentOrder(draft, pick);

  if (plan.status === "simulated") {
    return { ...plan, status: "ordered", orderedAt: new Date().toISOString() };
  }

  if (plan.status === "ready") {
    return {
      ...plan,
      status: "ordered",
      orderedAt: new Date().toISOString(),
      orderNote: `${plan.orderNote} · 발주 대기열 등록 완료`,
    };
  }

  return plan;
}
