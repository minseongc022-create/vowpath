import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { DEFAULT_BOOKING_MODE } from "./booking-policy";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { normalizeShopState } from "./shop-storage";
import type { ShopState } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "shop-profiles.json");

export type ShopProfile = ShopState;

function kvKey(userId: string) {
  return `vowpath:shop-profile:${userId}`;
}

export function defaultShopProfile(): ShopProfile {
  return {
    scheduleWindows: [],
    answerScheduleActive: false,
    scheduleAlwaysOn: false,
    jobberConnected: false,
    forwardingDone: false,
    onboardingComplete: false,
    bookingMode: DEFAULT_BOOKING_MODE,
  };
}

export function mergeShopProfile(
  partial?: Partial<ShopProfile> | null,
): ShopProfile {
  return normalizeShopState(partial ?? undefined);
}

async function readFileStore(): Promise<Record<string, ShopProfile>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Record<string, ShopProfile>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, ShopProfile>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function getShopProfile(userId: string): Promise<ShopProfile> {
  if (useKvStore()) {
    const raw = await kvGetSafe<Partial<ShopProfile>>(kvKey(userId));
    return mergeShopProfile(raw ?? undefined);
  }
  const all = await readFileStore();
  return mergeShopProfile(all[userId]);
}

export async function saveShopProfile(
  userId: string,
  partial: Partial<ShopProfile>,
): Promise<ShopProfile> {
  const current = await getShopProfile(userId);
  const next = mergeShopProfile({ ...current, ...partial });

  if (useKvStore()) {
    await kv.set(kvKey(userId), next);
    return next;
  }

  const all = await readFileStore();
  all[userId] = next;
  await writeFileStore(all);
  return next;
}
