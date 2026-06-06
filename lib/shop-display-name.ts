export const DEFAULT_SHOP_DISPLAY_NAME = "HVAC 서비스";

export function resolveShopDisplayName(shopName?: string | null): string {
  const trimmed = shopName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_SHOP_DISPLAY_NAME;
}
