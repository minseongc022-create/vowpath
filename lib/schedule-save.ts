import { rowToWindow, type ScheduleRow } from "./schedule-format";
import type { ShopState } from "./types";
import { writeShopState } from "./shop-storage";

export function canSaveSchedule(rows: ScheduleRow[]) {
  return rows.some((row) => row.days.length > 0);
}

export function saveSchedule(
  shop: ShopState,
  rows: ScheduleRow[],
  activateAi: boolean,
): ShopState {
  const scheduleWindows = rows.map((row) => rowToWindow(row));
  const next: ShopState = {
    ...shop,
    scheduleWindows,
    answerScheduleActive: activateAi,
  };
  writeShopState(next);
  return next;
}

export function markJobberConfirmed(shop: ShopState): ShopState {
  const next: ShopState = {
    ...shop,
    jobberConnected: true,
    jobberSetupConfirmed: true,
  };
  writeShopState(next);
  return next;
}

export function markForwardingDone(shop: ShopState): ShopState {
  const next: ShopState = {
    ...shop,
    forwardingDone: true,
    onboardingComplete: true,
  };
  writeShopState(next);
  return next;
}
