import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "./forwarding-guides";
import {
  alwaysOnWindow,
  rowToWindow,
  type ScheduleRow,
} from "./schedule-format";
import type { ShopState } from "./types";
import { writeShopState } from "./shop-storage";

export function canSaveSchedule(rows: ScheduleRow[], alwaysOn = false) {
  return alwaysOn || rows.some((row) => row.days.length > 0);
}

export function saveSchedule(
  shop: ShopState,
  rows: ScheduleRow[],
  activateAi: boolean,
  alwaysOn = false,
): ShopState {
  const scheduleWindows = alwaysOn
    ? [alwaysOnWindow()]
    : rows.map((row) => rowToWindow(row));
  const next: ShopState = {
    ...shop,
    scheduleWindows,
    answerScheduleActive: activateAi,
    scheduleAlwaysOn: alwaysOn,
  };
  writeShopState(next);
  return next;
}

export function markJobberConfirmed(shop: ShopState): ShopState {
  const next: ShopState = {
    ...shop,
    jobberConnected: true,
    jobberSetupConfirmed: true,
    jobberSkipped: false,
  };
  writeShopState(next);
  return next;
}

export function markJobberSkipped(shop: ShopState): ShopState {
  const next: ShopState = {
    ...shop,
    jobberSkipped: true,
    jobberSetupConfirmed: false,
  };
  writeShopState(next);
  return next;
}

export function markForwardingDone(
  shop: ShopState,
  prefs?: { scenario?: ForwardingScenarioId; provider?: ForwardingProviderId },
): ShopState {
  const next: ShopState = {
    ...shop,
    forwardingDone: true,
    onboardingComplete: true,
    ...(prefs?.scenario ? { forwardingScenario: prefs.scenario } : {}),
    ...(prefs?.provider ? { forwardingProvider: prefs.provider } : {}),
  };
  writeShopState(next);
  return next;
}
