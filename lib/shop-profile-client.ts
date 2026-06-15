import type { ShopState } from "./types";
import { normalizeShopState, readShopState, writeShopState } from "./shop-storage";

export async function fetchShopProfile(): Promise<ShopState | null> {
  try {
    const res = await fetch("/api/shop/profile", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: ShopState };
    if (!data.profile) return null;

    const profile = normalizeShopState(data.profile);
    const local = readShopState();
    const serverEmpty =
      profile.scheduleWindows.length === 0 &&
      !profile.forwardingDone &&
      !profile.answerScheduleActive;
    const localHasData =
      local.scheduleWindows.length > 0 ||
      local.forwardingDone ||
      local.answerScheduleActive;

    if (serverEmpty && localHasData) {
      const migrated = await patchShopProfile(local);
      return migrated ?? profile;
    }

    writeShopState(profile);
    return profile;
  } catch {
    return null;
  }
}

export async function patchShopProfile(
  partial: Partial<ShopState>,
): Promise<ShopState | null> {
  try {
    const res = await fetch("/api/shop/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: ShopState };
    if (data.profile) {
      const profile = normalizeShopState(data.profile);
      writeShopState(profile);
      return profile;
    }
    return null;
  } catch {
    return null;
  }
}
