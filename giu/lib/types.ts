export type GiuMarket = "vn" | "kr";

export type GiuDistrict =
  | "quan_1"
  | "quan_3"
  | "quan_5"
  | "quan_7"
  | "quan_10"
  | "binh_thanh"
  | "phu_nhuan";

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

export type GiuPaymentMethod = "momo" | "vietqr" | "card";

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
  createdAt: string;
};

export type GiuBox = {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  category: GiuCategory;
  originalPriceVnd: number;
  salePriceVnd: number;
  quantityTotal: number;
  quantityLeft: number;
  pickupStart: string;
  pickupEnd: string;
  freshnessNote?: string;
  status: GiuBoxStatus;
  createdAt: string;
  expiresAt: string;
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
  settlementStatus?: GiuSettlementStatus;
  settledAt?: string;
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

export type GiuStore = {
  merchants: GiuMerchant[];
  boxes: GiuBox[];
  reservations: GiuReservation[];
  waitlist: GiuWaitlistEntry[];
  accounts: GiuAccount[];
};
