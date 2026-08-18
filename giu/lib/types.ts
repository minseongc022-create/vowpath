export type GiuMarket = "vn" | "kr";

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

export type GiuBoxStatus = "mo" | "het" | "huy";

export type GiuReservationStatus = "giu_cho" | "da_lay" | "het_han" | "huy";

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
  freshnessNote?: string;
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
  refundedAt?: string;
  refundType?: "full" | "partial";
  chatLastReadCustomerAt?: string;
  chatLastReadMerchantAt?: string;
  status: GiuReservationStatus;
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
  /** customerId → favorited merchantIds */
  customerFavorites: Record<string, string[]>;
};
