import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "./forwarding-guides";
import {
  alwaysOnWindow,
  rowToWindow,
  type ScheduleRow,
} from "./schedule-format";
import { patchShopProfile } from "./shop-profile-client";
import type { ShopState } from "./types";
import { writeShopState } from "./shop-storage";

export function canSaveSchedule(rows: ScheduleRow[], alwaysOn = false) {
  return alwaysOn || rows.some((row) => row.days.length > 0);
}

async function persistShop(next: ShopState): Promise<ShopState> {
  writeShopState(next);
  const saved = await patchShopProfile(next);
  return saved ?? next;
}

export async function saveSchedule(
  shop: ShopState,
  rows: ScheduleRow[],
  activateAi: boolean,
  alwaysOn = false,
): Promise<ShopState> {
  const scheduleWindows = alwaysOn
    ? [alwaysOnWindow()]
    : rows.map((row) => rowToWindow(row));
  const next: ShopState = {
    ...shop,
    scheduleWindows,
    answerScheduleActive: activateAi,
    scheduleAlwaysOn: alwaysOn,
  };
  return persistShop(next);
}

export async function markJobberConfirmed(shop: ShopState): Promise<ShopState> {
  const next: ShopState = {
    ...shop,
    jobberConnected: true,
    jobberSetupConfirmed: true,
    jobberSkipped: false,
  };
  return persistShop(next);
}

export async function markJobberSkipped(shop: ShopState): Promise<ShopState> {
  const next: ShopState = {
    ...shop,
    jobberSkipped: true,
    jobberSetupConfirmed: false,
  };
  return persistShop(next);
}

export async function markForwardingDone(
  shop: ShopState,
  prefs?: { scenario?: ForwardingScenarioId; provider?: ForwardingProviderId },
): Promise<ShopState> {
  const next: ShopState = {
    ...shop,
    forwardingDone: true,
    onboardingComplete: true,
    ...(prefs?.scenario ? { forwardingScenario: prefs.scenario } : {}),
    ...(prefs?.provider ? { forwardingProvider: prefs.provider } : {}),
  };
  return persistShop(next);
}
