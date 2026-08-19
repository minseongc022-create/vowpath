import type { GiuReservation } from "./types";

export type GiuRiskLevel = "normal" | "needs_review" | "caution";

export type GiuCustomerRiskSnapshot = {
  level: GiuRiskLevel;
  reasons: string[];
  recentOrders: number;
  refundRequests: number;
  noShowReviews: number;
  pickupChanges: number;
  productReports: number;
};

export type GiuMerchantRiskSnapshot = {
  level: GiuRiskLevel;
  reasons: string[];
  recentOrders: number;
  cancellations: number;
  productReports: number;
  refundRejections: number;
  merchantProblemReports: number;
};

const RECENT_DAYS = 90;

function isRecent(iso: string, now = Date.now()): boolean {
  return now - new Date(iso).getTime() <= RECENT_DAYS * 86_400_000;
}

export function computeCustomerRisk(
  customerId: string,
  reservations: GiuReservation[],
): GiuCustomerRiskSnapshot {
  const mine = reservations.filter((r) => r.customerId === customerId && isRecent(r.createdAt));
  const recentOrders = mine.length;
  const refundRequests = mine.filter((r) => r.refundRequest || r.paymentStatus === "refunded").length;
  const noShowReviews = mine.filter((r) => r.status === "no_show_review").length;
  const pickupChanges = mine.reduce((s, r) => s + (r.pickupChangeCount ?? 0), 0);
  const productReports = mine.reduce((s, r) => s + (r.productReports?.length ?? 0), 0);

  const reasons: string[] = [];
  let level: GiuRiskLevel = "normal";

  if (recentOrders >= 10 && refundRequests >= 4) {
    reasons.push(`최근 ${recentOrders}건 주문 중 ${refundRequests}건 환불 요청`);
    level = "needs_review";
  }
  if (recentOrders >= 8 && noShowReviews >= 3) {
    reasons.push(`최근 ${recentOrders}건 주문 중 ${noShowReviews}건 노쇼 처리 검토`);
    level = "caution";
  }
  if (productReports >= 5) {
    reasons.push(`최근 상품 문제 신고 ${productReports}건`);
    level = level === "caution" ? "caution" : "needs_review";
  }

  return { level, reasons, recentOrders, refundRequests, noShowReviews, pickupChanges, productReports };
}

export function computeMerchantRisk(
  merchantId: string,
  reservations: GiuReservation[],
): GiuMerchantRiskSnapshot {
  const mine = reservations.filter((r) => r.merchantId === merchantId && isRecent(r.createdAt));
  const recentOrders = mine.length;
  const cancellations = mine.filter((r) => r.status === "order_cancelled" || r.status === "refund_completed").length;
  const productReports = mine.reduce((s, r) => s + (r.productReports?.length ?? 0), 0);
  const refundRejections = mine.filter((r) => r.refundRequest?.status === "rejected").length;
  const merchantProblemReports = mine.reduce((s, r) => s + (r.merchantProblemReports?.length ?? 0), 0);

  const reasons: string[] = [];
  let level: GiuRiskLevel = "normal";

  if (recentOrders >= 20 && merchantProblemReports >= 5) {
    reasons.push(`최근 ${recentOrders}건 주문 중 ${merchantProblemReports}건 가게 문제 신고`);
    level = "needs_review";
  }
  if (recentOrders >= 50 && productReports >= 7) {
    reasons.push(`최근 ${recentOrders}건 주문 중 ${productReports}건 상품 문제`);
    level = "caution";
  }

  return {
    level,
    reasons,
    recentOrders,
    cancellations,
    productReports,
    refundRejections,
    merchantProblemReports,
  };
}

export function riskLevelLabelKo(level: GiuRiskLevel): string {
  if (level === "needs_review") return "확인 필요";
  if (level === "caution") return "주의 필요";
  return "일반";
}
