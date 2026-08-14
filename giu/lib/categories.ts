import type { GiuCategory } from "./types";

export const GIu_CATEGORIES: {
  id: GiuCategory;
  label: string;
  emoji: string;
}[] = [
  { id: "banh_mi", label: "Bánh mì", emoji: "🥖" },
  { id: "bakery", label: "Tiệm bánh", emoji: "🥐" },
  { id: "cafe", label: "Cà phê", emoji: "☕" },
  { id: "tra_sua", label: "Trà sữa", emoji: "🧋" },
  { id: "nha_hang", label: "Nhà hàng", emoji: "🍜" },
  { id: "tap_hoa", label: "Tạp hóa", emoji: "🏪" },
  { id: "hoa", label: "Hoa tươi", emoji: "💐" },
  { id: "khac", label: "Món khác", emoji: "🍱" },
];

export function getCategoryLabel(id: GiuCategory): string {
  return GIu_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getCategoryEmoji(id: GiuCategory): string {
  return GIu_CATEGORIES.find((c) => c.id === id)?.emoji ?? "📦";
}

export function isGiuCategory(value: string): value is GiuCategory {
  return GIu_CATEGORIES.some((c) => c.id === value);
}
