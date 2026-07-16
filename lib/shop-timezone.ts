import type { ShopProfile } from "./shop-profile-db";
import {
  DEFAULT_SHOP_TIMEZONE,
  isValidIanaTimezone,
} from "./us-timezone";

/** Resolve the shop's IANA timezone (falls back to platform default). */
export function resolveShopTimezone(
  profile?: Pick<ShopProfile, "shopTimezone"> | null,
): string {
  const tz = profile?.shopTimezone?.trim();
  if (tz && isValidIanaTimezone(tz)) return tz;
  return DEFAULT_SHOP_TIMEZONE;
}
