import { findUserById } from "./users-db";
import { resolveShopDisplayName } from "./shop-display-name";

export { DEFAULT_SHOP_DISPLAY_NAME, resolveShopDisplayName } from "./shop-display-name";

export async function shopDisplayNameForUser(userId: string): Promise<string> {
  const user = await findUserById(userId);
  return resolveShopDisplayName(user?.shopName);
}
