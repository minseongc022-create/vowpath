/** Fallback when shop name is unset — US English for SMS/voice. */
export const DEFAULT_SHOP_DISPLAY_NAME = "Your restoration team";

export function resolveShopDisplayName(shopName?: string | null): string {
  const trimmed = shopName?.trim();
  if (!trimmed || trimmed.length === 0) return DEFAULT_SHOP_DISPLAY_NAME;
  // Ignore generic signup placeholder — treat as unset
  if (/^my hvac shop$/i.test(trimmed)) return DEFAULT_SHOP_DISPLAY_NAME;
  return trimmed.slice(0, 80);
}
