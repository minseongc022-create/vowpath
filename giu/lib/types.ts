export type GiuMarket = "vn" | "kr";

import type { GiuPlatformSettings } from "./platform-settings";

export type GiuDistrict =
  | "quan_1"
  | "quan_3"
  | "quan_5"
  | "quan_7"
  | "quan_10"
  | "binh_thanh"
  | "phu_nhuan"
  /** Incheon (KR merchant-first). */
  | "icn_jung"
  | "icn_dong"
  | "icn_michuhol"
  | "icn_yeonsu"
  | "icn_namdong"
  | "icn_bupyeong"
  | "icn_gyeyang"
  | "icn_seo";

export type GiuCategory =
  | "banh_mi"
  | "bakery"
  | "cafe"
  | "nha_hang"
  | "tap_hoa"
  | "tra_sua"
  | "hoa"
  | "khac";

export type GiuStorageMethod = "room" | "fridge" | "freezer" | "display" | "other";

export type GiuBoxStatus = "mo" | "het" | "huy";

export type GiuOrderStatus =
  | "payment_completed"
  | "merchant_confirmed"
  | "pickup_preparing"
  | "pickup_waiting"
  | "pickup_completed"
  | "not_picked_up"
  | "pickup_change_requested"
  | "pickup_change_completed"
  | "cancel_requested"
  | "refund_requested"
  | "refund_review"
  | "refund_processing"
  | "refund_completed"
  | "dispute_processing"
  | "admin_review_required"
  | "settlement_pending"
  | "settlement_completed"
  | "no_show_review"
  | "order_cancelled";

/** @deprecated Use GiuOrderStatus */
export type GiuReservationStatus = GiuOrderStatus;

export type GiuPaymentStatus = "pending" | "paid" | "failed" | "refunded";

/** Escrow: held until merchant confirms pickup. */
export type GiuSettlementStatus = "held" | "released" | "refunded";

export type GiuPaymentMethod =
  | "card"
  | "kakao"
  | "naver"
  | "toss"
  | "momo"
  | "vietqr";

export type GiuAccountRole = "customer" | "merchant";

export type GiuAccount = {
  id: string;
  role: GiuAccountRole;
  email: string;
  phone: string;
  passwordHash: string;
  name: string;
  merchantId?: string;
  market: GiuMarket;
  createdAt: string;
};

export type GiuMerchant = {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  category: GiuCategory;
  district: GiuDistrict;
  address: string;
  addressHint?: string;
  phone: string;
  zalo?: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  rescuedBoxes: number;
  market: GiuMarket;
  /** Settlement — bank account for pickup payouts. */
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  /** Per-store pickup / cancel rules (minutes & fee rates). */
  pickupPolicy?: Partial<{
    cancelFreeBeforeMinutes: number;
    extensionRequestBeforeMinutes: number;
    pickupGraceMinutes: number;
    lateCancelFeeRate: number;
    noShowFeeRate: number;
  }>;
  createdAt: string;
};

export type GiuBox = {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  /** Public HTTPS image URL (merchant-provided). Primary / first photo. */
  imageUrl?: string;
  /** Up to 5 product photos; first entry mirrors imageUrl when set. */
  imageUrls?: string[];
  category: GiuCategory;
  originalPriceVnd: number;
  salePriceVnd: number;
  quantityTotal: number;
  quantityLeft: number;
  pickupStart: string;
  pickupEnd: string;
  /** When the product was made (merchant-confirmed). */
  madeAt?: string;
  /** Best-before / consume-by date (optional). */
  bestBefore?: string;
  /** How the product is stored until pickup. */
  storageMethod?: GiuStorageMethod;
  /** Custom storage note when storageMethod is "other". */
  storageCustom?: string;
  freshnessNote?: string;
  /** 픽업일 변경 요청 허용 (기본 true). */
  pickupChangeAllowed?: boolean;
  status: GiuBoxStatus;
  /** Set when merchant cancels listing (status → huy). */
  cancelledAt?: string;
  createdAt: string;
  expiresAt: string;
};

export type GiuChatMessage = {
  id: string;
  reservationId: string;
  senderRole: GiuAccountRole;
  senderId: string;
  body: string;
  createdAt: string;
};

export type GiuOrderStatusLog = {
  id: string;
  reservationId: string;
  orderCode: string;
  fromStatus: GiuOrderStatus | null;
  toStatus: GiuOrderStatus;
  changedAt: string;
  changedByRole: "customer" | "merchant" | "system" | "admin";
  changedById: string;
  reason?: string;
  customerId: string;
  merchantId: string;
};

export type GiuReservation = {
  id: string;
  boxId: string;
  merchantId: string;
  customerId: string;
  code: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  totalVnd: number;
  /** Lemon Squeezy checkout amount (USD cents) when using custom_price. */
  chargeAmountUsdCents?: number;
  platformFeeVnd: number;
  paymentStatus: GiuPaymentStatus;
  paymentMethod?: GiuPaymentMethod;
  paymentId?: string;
  paidAt?: string;
  paymentExpiresAt?: string;
  /** True when Twilio SMS was actually sent; false/undefined if skipped or failed. */
  smsSent?: boolean;
  settlementStatus?: GiuSettlementStatus;
  settledAt?: string;
  /** Bank transfer queued after QR pickup. */
  payoutStatus?: "pending_account" | "queued" | "sent";
  payoutAmountVnd?: number;
  /** Amount returned to customer on cancel/refund. */
  refundAmountVnd?: number;
  /** Non-refundable no-show fee (partial refund). */
  noShowFeeVnd?: number;
  /** Customer sent in-app extension request (before cutoff). */
  pickupExtensionRequestedAt?: string;
  /** Structured extension request awaiting merchant approval. */
  extensionRequest?: {
    status: "pending" | "approved" | "rejected";
    reason: string;
    plannedPickupAt: string;
    requestedAt: string;
    reviewedAt?: string;
    merchantNote?: string;
    merchantPingAt?: string;
    merchantStorageConfirmed?: boolean;
  };
  /** Merchant-initiated pickup change proposal awaiting customer approval. */
  merchantPickupProposal?: {
    status: "pending" | "approved" | "rejected";
    plannedPickupAt: string;
    reason?: string;
    proposedAt: string;
    reviewedAt?: string;
    merchantStorageConfirmed?: boolean;
  };
  /** Original box pickup end at order time — for change limit validation. */
  originalPickupEnd?: string;
  /** Pickup change audit trail on this order. */
  pickupChangeHistory?: Array<{
    id: string;
    fromPickupEnd: string;
    toPickupEnd: string;
    requestedByRole: "customer" | "merchant";
    approvedByRole?: "customer" | "merchant";
    reason: string;
    requestedAt: string;
    reviewedAt?: string;
    status: "pending" | "approved" | "rejected";
  }>;
  /** Merchant agreed to hold (e.g. after phone call) — QR valid until then. */
  merchantPickupPromiseUntil?: string;
  /** Merchant confirmed silent no-show for compensation. */
  merchantNoShowMarkedAt?: string;
  /** System auto-refund after ghosted pickup window (no merchant action). */
  autoNoShowRefundAt?: string;
  /** Pickup reminder SMS sent (ISO timestamps). */
  pickupRemindersSent?: { at70?: string; at30?: string };
  refundedAt?: string;
  refundType?: "full" | "partial";
  /** When order entered 미수령 (not_picked_up). */
  notPickedUpAt?: string;
  /** In-app pickup change requests used. */
  pickupChangeCount?: number;
  /** Refund request detail. */
  refundRequest?: {
    reason: string;
    detail?: string;
    evidenceUrls?: string[];
    problemType?: string;
    requestedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    rejectReason?: string;
    status: "requested" | "review" | "approved" | "rejected" | "processing" | "completed";
  };
  /** Product / food-safety reports on this order. */
  productReports?: Array<{
    id: string;
    kind: string;
    description?: string;
    evidenceUrls?: string[];
    storageNote?: string;
    isFoodSafety: boolean;
    status: "open" | "merchant_review" | "disputed" | "resolved";
    createdAt: string;
  }>;
  /** Merchant problem reports by customer. */
  merchantProblemReports?: Array<{
    id: string;
    reason: string;
    detail?: string;
    createdAt: string;
  }>;
  /** Internal risk tier — never auto-deny rights. */
  customerRiskLevel?: "normal" | "needs_review" | "caution";
  merchantRiskLevel?: "normal" | "needs_review" | "caution";
  /** Admin dispute resolution. */
  adminDisputeResolution?: {
    outcome: "customer_fault" | "merchant_fault" | "needs_more_info" | "no_issue";
    reason: string;
    resolvedAt: string;
    adminId: string;
  };
  chatLastReadCustomerAt?: string;
  chatLastReadMerchantAt?: string;
  status: GiuOrderStatus;
  createdAt: string;
  expiresAt: string;
};

export type GiuWaitlistEntry = {
  id: string;
  phone: string;
  district?: GiuDistrict;
  createdAt: string;
};

export type GiuReview = {
  id: string;
  merchantId: string;
  reservationId: string;
  customerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

export type GiuStore = {
  merchants: GiuMerchant[];
  boxes: GiuBox[];
  reservations: GiuReservation[];
  waitlist: GiuWaitlistEntry[];
  accounts: GiuAccount[];
  reviews: GiuReview[];
  chatMessages: GiuChatMessage[];
  /** Audit trail for order status changes. */
  orderStatusLogs: GiuOrderStatusLog[];
  /** Platform-wide settings (admin). */
  platformSettings?: Partial<GiuPlatformSettings>;
  /** customerId → favorited merchantIds */
  customerFavorites: Record<string, string[]>;
};
