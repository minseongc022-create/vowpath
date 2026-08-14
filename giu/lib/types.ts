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
  | "hoa";

export type GiuBoxStatus = "mo" | "het" | "huy";

export type GiuReservationStatus = "giu_cho" | "da_lay" | "het_han" | "huy";

export type GiuMerchant = {
  id: string;
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
  status: GiuBoxStatus;
  createdAt: string;
  expiresAt: string;
};

export type GiuReservation = {
  id: string;
  boxId: string;
  merchantId: string;
  code: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  totalVnd: number;
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
};
