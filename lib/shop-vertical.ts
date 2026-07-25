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

/** Verticals with real landing pages, proof, and content depth today — shown in
 *  onboarding/settings pickers. Plumbing/electrical/pest have working dispatch logic
 *  (see vertical-config.ts) but no marketing content or real customers yet, so they stay
 *  out of the picker until there's a shop in one of them. Bump this list, not
 *  ALL_SHOP_VERTICALS, to bring one back — the dispatch logic never went away. */
export const VISIBLE_SHOP_VERTICALS: ShopVertical[] = ["restoration", "hvac"];

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

const VERTICAL_LABEL_EN: Record<ShopVertical, string> = {
  restoration: "Restoration",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  pest: "Pest control",
  general: "Field service",
};

const VERTICAL_LABEL_KO: Record<ShopVertical, string> = {
  restoration: "복구",
  hvac: "HVAC",
  plumbing: "배관",
  electrical: "전기",
  pest: "방제",
  general: "현장 서비스",
};

/** Short trade label for sidebar / headers (locale-aware). */
export function shopVerticalLabel(
  vertical: ShopVertical | string | null | undefined,
  locale: "en" | "ko" | string = "en",
): string {
  const v = normalizeShopVertical(vertical);
  return locale === "ko" ? VERTICAL_LABEL_KO[v] : VERTICAL_LABEL_EN[v];
}

export function isRestorationVertical(vertical: ShopVertical): boolean {
  return vertical === "restoration";
}
