import type { CatalogProduct, MerchantData, SettlementRow, TossShopAccount, TossShopMerchant } from "./types";

export const SEED_MERCHANT: TossShopMerchant = {
  id: "merch_demo",
  shopName: "데모마켓",
  category: "food",
  bankName: "토스뱅크",
  bankAccount: "1000-0000-0000",
  createdAt: "2026-01-15T00:00:00.000Z",
  dataSource: "demo",
};

export const SEED_ACCOUNT: TossShopAccount = {
  id: "acc_demo",
  email: "demo@tossshop.local",
  passwordHash: "",
  name: "데모 셀러",
  merchantId: SEED_MERCHANT.id,
  createdAt: "2026-01-15T00:00:00.000Z",
  plan: "trial",
  trialEndsAt: "2027-01-15T00:00:00.000Z",
};

export const SEED_CATALOG: CatalogProduct[] = [
  { id: "p001", name: "국내산 제철 사과 5kg", category: "food", priceKrw: 28900, reviewCount: 1240, rating: 4.8, sellerName: "과일나라", rank: 1, rankPrev: 2, updatedAt: new Date().toISOString() },
  { id: "p002", name: "프리미엄 한우 등심 600g", category: "food", priceKrw: 45900, reviewCount: 890, rating: 4.9, sellerName: "정육마켓", rank: 2, rankPrev: 1, updatedAt: new Date().toISOString() },
  { id: "p003", name: "유기농 방울토마토 1kg", category: "food", priceKrw: 8900, reviewCount: 2100, rating: 4.7, sellerName: "데모마켓", rank: 3, rankPrev: 5, updatedAt: new Date().toISOString() },
  { id: "p004", name: "히알루론 수분 크림 50ml", category: "beauty", priceKrw: 19900, reviewCount: 3400, rating: 4.6, sellerName: "뷰티랩", rank: 1, rankPrev: 1, updatedAt: new Date().toISOString() },
  { id: "p005", name: "비타민C 고함량 90정", category: "health", priceKrw: 15900, reviewCount: 5600, rating: 4.8, sellerName: "헬스플러스", rank: 2, rankPrev: 3, updatedAt: new Date().toISOString() },
  { id: "p006", name: "무선 청소기 미니형", category: "home", priceKrw: 39900, reviewCount: 780, rating: 4.5, sellerName: "홈케어", rank: 4, rankPrev: 6, updatedAt: new Date().toISOString() },
  { id: "p007", name: "블루투스 이어폰 ANC", category: "digital", priceKrw: 49900, reviewCount: 4200, rating: 4.7, sellerName: "테크존", rank: 1, rankPrev: 2, updatedAt: new Date().toISOString() },
  { id: "p008", name: "기모 후드티 오버핏", category: "fashion", priceKrw: 24900, reviewCount: 1100, rating: 4.4, sellerName: "스트릿샵", rank: 3, rankPrev: 4, updatedAt: new Date().toISOString() },
  { id: "p009", name: "친환경 주방세제 2L", category: "home", priceKrw: 12900, reviewCount: 980, rating: 4.6, sellerName: "데모마켓", rank: 5, rankPrev: 7, updatedAt: new Date().toISOString() },
  { id: "p010", name: "프로틴 바 12개입", category: "health", priceKrw: 22900, reviewCount: 670, rating: 4.5, sellerName: "핏푸드", rank: 6, rankPrev: 8, updatedAt: new Date().toISOString() },
  { id: "p011", name: "오가닉 그린티 100티백", category: "food", priceKrw: 14900, reviewCount: 450, rating: 4.3, sellerName: "티하우스", rank: 7, rankPrev: 9, updatedAt: new Date().toISOString() },
  { id: "p012", name: "LED 무드등 USB-C", category: "home", priceKrw: 18900, reviewCount: 320, rating: 4.2, sellerName: "라이트존", rank: 8, rankPrev: 10, updatedAt: new Date().toISOString() },
];

export const SEED_SETTLEMENTS: SettlementRow[] = [
  { id: "stl_001", orderId: "TS-20260801-001", orderDate: "2026-08-01", productName: "유기농 방울토마토 1kg", grossKrw: 8900, platformFeeKrw: 712, shippingFeeKrw: 0, expectedPayoutKrw: 8188, actualPayoutKrw: 8188, status: "matched", purchaseConfirmedAt: "2026-08-08", payoutDate: "2026-08-10" },
  { id: "stl_002", orderId: "TS-20260803-014", orderDate: "2026-08-03", productName: "친환경 주방세제 2L", grossKrw: 12900, platformFeeKrw: 1032, shippingFeeKrw: 2500, expectedPayoutKrw: 9368, status: "pending", purchaseConfirmedAt: "2026-08-10" },
  { id: "stl_003", orderId: "TS-20260805-022", orderDate: "2026-08-05", productName: "유기농 방울토마토 1kg", grossKrw: 17800, platformFeeKrw: 1424, shippingFeeKrw: 0, expectedPayoutKrw: 16376, actualPayoutKrw: 15000, status: "discrepancy", purchaseConfirmedAt: "2026-08-12", payoutDate: "2026-08-14", note: "정산금 차액 1,376원" },
  { id: "stl_004", orderId: "TS-20260810-008", orderDate: "2026-08-10", productName: "친환경 주방세제 2L", grossKrw: 12900, platformFeeKrw: 1032, shippingFeeKrw: 2500, expectedPayoutKrw: 9368, status: "pending" },
];

export function defaultMerchantData(): MerchantData {
  return {
    watchlist: [
      { id: "wl_001", productId: "p001", alertPriceDropPct: 5, addedAt: "2026-08-01T00:00:00.000Z" },
      { id: "wl_002", productId: "p004", alertPriceDropPct: 10, alertRankUp: 3, addedAt: "2026-08-05T00:00:00.000Z" },
    ],
    keywords: [
      { id: "kw_001", keyword: "방울토마토", myProductId: "p003", addedAt: "2026-08-01T00:00:00.000Z" },
      { id: "kw_002", keyword: "주방세제", myProductId: "p009", addedAt: "2026-08-03T00:00:00.000Z" },
    ],
    competitors: [
      { id: "comp_001", sellerName: "과일나라", trackedProductIds: ["p001"], addedAt: "2026-08-01T00:00:00.000Z" },
      { id: "comp_002", sellerName: "뷰티랩", trackedProductIds: ["p004"], addedAt: "2026-08-02T00:00:00.000Z" },
    ],
    alertRules: [
      { id: "rule_001", competitorId: "comp_001", metric: "price_drop", threshold: 5, channel: "in_app", enabled: true, createdAt: "2026-08-01T00:00:00.000Z" },
      { id: "rule_002", competitorId: "comp_002", metric: "rank_up", threshold: 2, channel: "in_app", enabled: true, createdAt: "2026-08-02T00:00:00.000Z" },
    ],
    alerts: [],
    settlements: [...SEED_SETTLEMENTS],
  };
}
