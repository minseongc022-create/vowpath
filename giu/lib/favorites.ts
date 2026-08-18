/** Client-side favorites cache — synced to account when logged in. */

const FAVORITES_KEY = "giu-favorites-merchants";
const SEEN_BOXES_KEY = "giu-alert-seen-box-ids";
const SEEN_ORDERS_KEY = "giu-alert-seen-order-ids";
const BOX_ALERTS_BOOT_KEY = "giu-box-alerts-boot";
const ORDER_ALERTS_BOOT_KEY = "giu-order-alerts-boot";

function scopedKey(base: string, scopeId?: string): string {
  return scopeId ? `${base}:${scopeId}` : base;
}

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
}

export function getFavoriteMerchantIds(): string[] {
  return readIds(FAVORITES_KEY);
}

export function isFavoriteMerchant(merchantId: string): boolean {
  return getFavoriteMerchantIds().includes(merchantId);
}

/** Returns true if now favorited. */
export function toggleFavoriteMerchant(merchantId: string): boolean {
  const ids = getFavoriteMerchantIds();
  const idx = ids.indexOf(merchantId);
  if (idx >= 0) {
    ids.splice(idx, 1);
    writeIds(FAVORITES_KEY, ids);
    return false;
  }
  ids.push(merchantId);
  writeIds(FAVORITES_KEY, ids);
  return true;
}

/** Merge localStorage favorites with server after login. */
export async function syncFavoritesWithServer(): Promise<string[]> {
  const local = getFavoriteMerchantIds();
  try {
    const res = await fetch("/api/giu/favorites", { credentials: "include" });
    if (res.status === 401) return local;
    const data = (await res.json()) as { merchantIds?: string[] };
    const server = data.merchantIds ?? [];
    const merged = [...new Set([...server, ...local])];
    const put = await fetch("/api/giu/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ merchantIds: merged }),
    });
    if (put.ok) {
      const synced = (await put.json()) as { merchantIds?: string[] };
      const ids = synced.merchantIds ?? merged;
      writeIds(FAVORITES_KEY, ids);
      return ids;
    }
    writeIds(FAVORITES_KEY, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function toggleFavoriteRemote(merchantId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/giu/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ merchantId }),
    });
    if (res.status === 401) return toggleFavoriteMerchant(merchantId);
    const data = (await res.json()) as { ids?: string[]; favorited?: boolean };
    if (data.ids) writeIds(FAVORITES_KEY, data.ids);
    return Boolean(data.favorited);
  } catch {
    return toggleFavoriteMerchant(merchantId);
  }
}

export function getSeenBoxIds(scopeId?: string): string[] {
  return readIds(scopedKey(SEEN_BOXES_KEY, scopeId));
}

export function markBoxesSeen(boxIds: string[], scopeId?: string): void {
  writeIds(scopedKey(SEEN_BOXES_KEY, scopeId), [...getSeenBoxIds(scopeId), ...boxIds]);
}

export function getSeenOrderIds(merchantId?: string): string[] {
  return readIds(scopedKey(SEEN_ORDERS_KEY, merchantId));
}

export function markOrdersSeen(orderIds: string[], merchantId?: string): void {
  writeIds(scopedKey(SEEN_ORDERS_KEY, merchantId), [...getSeenOrderIds(merchantId), ...orderIds]);
}

/** First poll should not spam — mark current inventory as already seen. Returns false on first boot. */
export function bootstrapBoxAlerts(boxIds: string[], scopeId?: string): boolean {
  if (typeof window === "undefined") return true;
  const bootKey = scopedKey(BOX_ALERTS_BOOT_KEY, scopeId);
  if (window.localStorage.getItem(bootKey) === "1") return true;
  markBoxesSeen(boxIds, scopeId);
  window.localStorage.setItem(bootKey, "1");
  return false;
}

export function bootstrapOrderAlerts(orderIds: string[], merchantId: string): boolean {
  if (typeof window === "undefined") return true;
  const bootKey = scopedKey(ORDER_ALERTS_BOOT_KEY, merchantId);
  if (window.localStorage.getItem(bootKey) === "1") return true;
  markOrdersSeen(orderIds, merchantId);
  window.localStorage.setItem(bootKey, "1");
  return false;
}
