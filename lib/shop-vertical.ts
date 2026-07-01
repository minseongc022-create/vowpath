export type ShopVertical =
  | "restoration"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "pest"
  | "general";

export const ALL_SHOP_VERTICALS: ShopVertical[] = [
  "restoration",
  "hvac",
  "plumbing",
  "electrical",
  "pest",
  "general",
];

export function normalizeShopVertical(value: unknown): ShopVertical {
  if (typeof value !== "string") return "restoration";
  const v = value.trim().toLowerCase();
  if (
    v === "restoration" ||
    v === "hvac" ||
    v === "plumbing" ||
    v === "electrical" ||
    v === "pest" ||
    v === "general"
  ) {
    return v as ShopVertical;
  }
  return "restoration";
}

export function isRestorationVertical(vertical: ShopVertical): boolean {
  return vertical === "restoration";
}
