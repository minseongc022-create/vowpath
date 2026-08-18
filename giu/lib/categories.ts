import { KR_MERCHANT_CATEGORIES } from "./market";
import type { GiuCategory, GiuMarket } from "./types";

export const GIu_CATEGORIES: {
  id: GiuCategory;
  label: string;
  emoji: string;
}[] = [
  { id: "banh_mi", label: "빵·샌드위치", emoji: "🥖" },
  { id: "bakery", label: "베이커리", emoji: "🥐" },
  { id: "cafe", label: "카페·디저트", emoji: "☕" },
  { id: "tra_sua", label: "버블티", emoji: "🧋" },
  { id: "nha_hang", label: "식당", emoji: "🍜" },
  { id: "tap_hoa", label: "편의점", emoji: "🏪" },
  { id: "hoa", label: "꽃", emoji: "💐" },
  { id: "khac", label: "기타", emoji: "🍱" },
];

export function categoriesForMarket(market: GiuMarket) {
  const list = market === "kr" ? KR_MERCHANT_CATEGORIES : GIu_CATEGORIES.map((c) => c.id);
  return GIu_CATEGORIES.filter((c) => list.includes(c.id)).map((c) => ({
    ...c,
    label: market === "kr" ? (KR_LABEL_OVERRIDES[c.id] ?? c.label) : c.label,
  }));
}

const KR_LABEL_OVERRIDES: Partial<Record<GiuCategory, string>> = {
  tra_sua: "디저트·음료",
  banh_mi: "샌드위치·간편식",
  nha_hang: "식당·한식",
};

export function merchantCategories() {
  return categoriesForMarket("kr");
}

export function getCategoryLabel(id: GiuCategory): string {
  return GIu_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getCategoryEmoji(id: GiuCategory): string {
  return GIu_CATEGORIES.find((c) => c.id === id)?.emoji ?? "📦";
}

export function isGiuCategory(value: string): value is GiuCategory {
  return GIu_CATEGORIES.some((c) => c.id === value);
}
