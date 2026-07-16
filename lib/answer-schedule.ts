import { isWithinAnyAiSchedule } from "./missed-calls-prevented";
import { parseRowsFromStored } from "./schedule-format";
import { getShopProfile } from "./shop-profile-db";
import type { ShopProfile } from "./shop-profile-db";
import { resolveShopTimezone } from "./shop-timezone";

/** Whether Effiroad should actively handle calls right now (server-side). */
export function shouldAnswerNow(profile: ShopProfile, now = new Date()): boolean {
  if (!profile.answerScheduleActive) return false;
  if (profile.scheduleAlwaysOn) return true;
  const rows = parseRowsFromStored(profile.scheduleWindows);
  if (rows.length === 0) return false;
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
