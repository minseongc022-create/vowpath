import { getShopProfile } from "./shop-profile-db";
import { normalizeShopVertical, type ShopVertical } from "./shop-vertical.js";
import { getVerticalConfig, type VerticalConfig } from "./vertical-config.js";

export async function getShopVertical(userId: string): Promise<ShopVertical> {
  const profile = await getShopProfile(userId);
  return normalizeShopVertical((profile as { vertical?: unknown }).vertical);
}

export async function getVerticalConfigForUser(userId: string): Promise<VerticalConfig> {
  const vertical = await getShopVertical(userId);
  return getVerticalConfig(vertical);
}
