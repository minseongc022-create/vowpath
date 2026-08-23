/**
 * 위탁 주문 자동 처리 — 토스 주문 → 도매매 발주 준비 → 송장 등록
 */

import type { TossApiConfig } from "../api/config";
import {
  listRecentOrders,
  markOrderPreparing,
  registerOrderTracking,
  type TossOrderProduct,
} from "../api/orders";
import type { JarvisFulfillmentJob, JarvisListingDraft } from "../types";

export const FULFILLMENT_ENGINE_VERSION = "1.0";

export type FulfillmentCycleResult = {
  ordersScanned: number;
  newJobs: number;
  wholesalePrepared: number;
  trackingRegistered: number;
  errors: string[];
};

function findMatchingDraft(
  order: TossOrderProduct,
  drafts: JarvisListingDraft[],
): JarvisListingDraft | undefined {
  return drafts.find(
    (d) =>
      d.tossProductId === order.productId ||
      d.listingPayload.name.includes(order.productName.slice(0, 8)) ||
      order.productName.includes(d.keyword),
  );
}

function buildSupplierOrderPayload(order: TossOrderProduct, draft?: JarvisListingDraft): {
  receiverName: string;
  receiverPhone: string;
  address: string;
  zipCode: string;
  quantity: number;
  supplierUrl?: string;
  itemNo?: number;
  note: string;
} {
  const supplierUrl = draft?.listingPayload.supplierUrl;
  const itemNo = draft?.consignmentOrder?.itemNo;
  const shipTo = `${order.receiverName} / ${order.address} ${order.detailAddress} (${order.zipCode}) · ${order.quantity}개`;

  // 수입판매(1688/타오바오/일본 소싱)는 도매매 발주 대상이 아님 — 잘못된 "도매매" 라벨을
  // 붙이면 판매자가 엉뚱한 사이트에서 발주하게 되므로 pickMode별로 문구를 분리한다.
  if (draft?.pickMode === "import") {
    const country = draft.listingPayload.supplierPlatform ?? "해외";
    return {
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      address: `${order.address} ${order.detailAddress}`.trim(),
      zipCode: order.zipCode,
      quantity: order.quantity,
      supplierUrl,
      itemNo: undefined,
      note: supplierUrl
        ? `수입판매(${country}) 발주 필요 — ${supplierUrl} 에서 수동 발주. 배송지: ${shipTo}`
        : `수입판매(${country}) 발주 필요 — 소싱 URL 없음, 등록함에서 공급처 확인. 배송지: ${shipTo}`,
    };
  }

  return {
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    address: `${order.address} ${order.detailAddress}`.trim(),
    zipCode: order.zipCode,
    quantity: order.quantity,
    supplierUrl,
    itemNo,
    note: itemNo
      ? `도매매 ${itemNo} — ${shipTo}`
      : `도매매 발주 — ${order.receiverName} · ${order.address} · ${order.quantity}개`,
  };
}

export async function processFulfillmentCycle(input: {
  merchantId: string;
  config: TossApiConfig;
  listingDrafts: JarvisListingDraft[];
  existingJobs: JarvisFulfillmentJob[];
}): Promise<{ jobs: JarvisFulfillmentJob[]; result: FulfillmentCycleResult }> {
  const result: FulfillmentCycleResult = {
    ordersScanned: 0,
    newJobs: 0,
    wholesalePrepared: 0,
    trackingRegistered: 0,
    errors: [],
  };

  const jobs = [...input.existingJobs];
  const knownIds = new Set(jobs.map((j) => j.orderProductId));

  let orders: TossOrderProduct[] = [];
  try {
    orders = await listRecentOrders(input.merchantId, input.config, 7);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "ORDER_SYNC_FAIL");
    return { jobs, result };
  }

  result.ordersScanned = orders.length;

  for (const order of orders) {
    if (knownIds.has(order.orderProductId)) continue;
    if (!["PAID", "PREPARING_PRODUCT"].includes(order.orderProductStatus)) continue;

    const draft = findMatchingDraft(order, input.listingDrafts);
    const supplierPayload = buildSupplierOrderPayload(order, draft);

    const job: JarvisFulfillmentJob = {
      id: `ful_${order.orderProductId}`,
      merchantId: input.merchantId,
      orderId: order.orderId,
      orderProductId: order.orderProductId,
      productName: order.productName,
      status: "detected",
      tossOrderStatus: order.orderProductStatus,
      customer: {
        name: order.receiverName,
        phone: order.receiverPhone,
        address: supplierPayload.address,
        zipCode: order.zipCode,
      },
      quantity: order.quantity,
      wholesalePlatform: draft?.listingPayload.supplierPlatform,
      supplierUrl: supplierPayload.supplierUrl,
      itemNo: supplierPayload.itemNo,
      domemeOrderNote: supplierPayload.note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    jobs.unshift(job);
    knownIds.add(order.orderProductId);
    result.newJobs++;
  }

  for (const job of jobs) {
    if (job.status === "detected" && job.tossOrderStatus === "PAID") {
      try {
        const ok = await markOrderPreparing(input.merchantId, input.config, [job.orderProductId]);
        if (ok) {
          job.status = "toss_preparing";
          job.tossOrderStatus = "PREPARING_PRODUCT";
          job.updatedAt = new Date().toISOString();
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "PREPARING_FAIL");
      }
    }

    if (
      ["detected", "toss_preparing"].includes(job.status) &&
      job.supplierUrl
    ) {
      const prev = job.status;
      job.status = "wholesale_ready";
      job.wholesalePreparedAt = job.wholesalePreparedAt ?? new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      if (prev !== "wholesale_ready") result.wholesalePrepared++;
    }

    if (
      job.pendingTrackingNumber &&
      job.pendingDeliveryCompany &&
      job.status !== "tracking_registered"
    ) {
      try {
        const ok = await registerOrderTracking(input.merchantId, input.config, {
          orderProductId: job.orderProductId,
          deliveryCompany: job.pendingDeliveryCompany,
          trackingNumber: job.pendingTrackingNumber,
        });
        if (ok) {
          job.status = "tracking_registered";
          job.trackingNumber = job.pendingTrackingNumber;
          job.deliveryCompany = job.pendingDeliveryCompany;
          job.trackingRegisteredAt = new Date().toISOString();
          job.updatedAt = new Date().toISOString();
          result.trackingRegistered++;
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "TRACKING_FAIL");
      }
    }
  }

  return { jobs: jobs.slice(0, 100), result };
}

export function applyWholesaleOrderConfirmed(job: JarvisFulfillmentJob): JarvisFulfillmentJob {
  return {
    ...job,
    status: "wholesale_ordered",
    wholesaleOrderedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function applyTrackingFromSupplier(
  job: JarvisFulfillmentJob,
  trackingNumber: string,
  deliveryCompany = "CJ대한통운",
): JarvisFulfillmentJob {
  return {
    ...job,
    pendingTrackingNumber: trackingNumber,
    pendingDeliveryCompany: deliveryCompany,
    updatedAt: new Date().toISOString(),
  };
}
