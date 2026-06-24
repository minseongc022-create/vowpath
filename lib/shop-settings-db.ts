import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import {
  DEFAULT_SHOP_BOOKING_SETTINGS,
  coalesceSchedulingSettingsPatch,
  mergeShopBookingSettings,
  newTenantShopBookingSettings,
  type OwnerApprovalSms,
  type SchedulingMode,
  type ShopBookingSettings,
} from "./booking-settings";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "shop-settings.json");

function kvKey(userId: string) {
  return `vowroad:shop-settings:${userId}`;
}

async function readFileStore(): Promise<Record<string, ShopBookingSettings>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Record<string, ShopBookingSettings>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, ShopBookingSettings>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function getShopBookingSettings(
  userId: string,
): Promise<ShopBookingSettings> {
  if (useKvStore()) {
    const raw = await kvGetSafe<Partial<ShopBookingSettings>>(kvKey(userId));
    return mergeShopBookingSettings(raw ?? undefined);
  }
  const all = await readFileStore();
  return mergeShopBookingSettings(all[userId]);
}

export async function saveShopBookingSettings(
  userId: string,
  partial: Partial<ShopBookingSettings>,
): Promise<ShopBookingSettings> {
  const current = await getShopBookingSettings(userId);
  const coalesced = coalesceSchedulingSettingsPatch(current, partial);
  const next = mergeShopBookingSettings({ ...current, ...coalesced });

  if (useKvStore()) {
    await kv.set(kvKey(userId), next);
    return next;
  }

  const all = await readFileStore();
  all[userId] = next;
  await writeFileStore(all);
  return next;
}

export async function decrementShadowMode(
  userId: string,
): Promise<ShopBookingSettings> {
  const current = await getShopBookingSettings(userId);
  if (current.shadowModeRemaining <= 0) return current;
  return saveShopBookingSettings(userId, {
    shadowModeRemaining: current.shadowModeRemaining - 1,
  });
}

/** First signup — hybrid + 14-day shadow baseline (idempotent). */
export async function initializeNewTenantShopSettings(userId: string): Promise<ShopBookingSettings> {
  if (useKvStore()) {
    const existing = await kvGetSafe<Partial<ShopBookingSettings>>(kvKey(userId));
    if (existing && Object.keys(existing).length > 0) {
      return mergeShopBookingSettings(existing);
    }
    const next = newTenantShopBookingSettings();
    await kv.set(kvKey(userId), next);
    return next;
  }
  const all = await readFileStore();
  if (all[userId]) {
    return mergeShopBookingSettings(all[userId]);
  }
  const next = newTenantShopBookingSettings();
  all[userId] = next;
  await writeFileStore(all);
  return next;
}
