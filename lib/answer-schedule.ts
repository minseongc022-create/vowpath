import { isWithinAnyAiSchedule } from "./missed-calls-prevented";
import { parseRowsFromStored } from "./schedule-format";
import { getShopProfile } from "./shop-profile-db";
import type { ShopProfile } from "./shop-profile-db";
import { resolveShopTimezone } from "./shop-timezone";

/** Whether Effiroad should actively handle calls right now (server-side). */
export function shouldAnswerNow(profile: ShopProfile, now = new Date()): boolean {
  if (!profile.answerScheduleActive) return false;
  if (profile.scheduleAlwaysOn) return true;

  const stored = Array.isArray(profile.scheduleWindows) ? profile.scheduleWindows : [];
  // Active with no saved windows must not invent default overnight hours.
  if (stored.length === 0) return false;

  const rows = parseRowsFromStored(stored);
  if (rows.some((row) => row.alwaysOn)) return true;

  const timeZone = resolveShopTimezone(profile);
  return isWithinAnyAiSchedule(now.toISOString(), rows, timeZone);
}

export async function shouldTenantAnswerNow(
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const profile = await getShopProfile(userId);
  return shouldAnswerNow(profile, now);
}
