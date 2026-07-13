import { isEntitled } from "./billing";
import { PILOT_TRIAL_DAYS } from "./billing-cohort";
import { findUserById, updateUserBilling } from "./users-db";
import { getTenantPhoneRecord } from "./tenant-phone-store";
import { resolveTenantUserId } from "./tenant-routing";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { kv } from "@vercel/kv";

export function userTwilioBoundKey(userId: string): string {
  return `effiroad:user-twilio-bound:${userId}`;
}

/** True when tenant has an Effiroad inbound line (provisioned or legacy-bound). */
export async function hasInboundTwilioLine(userId: string): Promise<boolean> {
  const phoneRec = await getTenantPhoneRecord(userId);
  if (phoneRec?.phoneNumber) return true;

  if (useKvStore()) {
    const bound = await kvGetSafe<string>(userTwilioBoundKey(userId));
    if (bound) return true;
    return false;
  }

  const { readFile } = await import("fs/promises");
  const path = await import("path");
  const mapPath = path.join(process.cwd(), "data", "twilio-phone-map.json");
  try {
    const raw = await readFile(mapPath, "utf-8");
    const store = JSON.parse(raw) as { mappings?: Record<string, string> };
    return Object.values(store.mappings ?? {}).includes(userId);
  } catch {
    return false;
  }
}

/** Grant or extend a 30-day pilot trial when the tenant has an inbound line. */
export async function ensurePilotTrial(userId: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) return false;
  if (isEntitled(user)) return true;

  const hasLine = await hasInboundTwilioLine(userId);
  if (!hasLine) return false;

  const trialEndsAt = new Date(
    Date.now() + PILOT_TRIAL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await updateUserBilling(userId, {
    subscriptionStatus: "trialing",
    trialEndsAt,
  });
  return true;
}

/** Grant pilot trial when an inbound call/SMS maps this To number to the tenant. */
export async function ensurePilotTrialForMappedPhone(
  userId: string,
  toE164: string,
): Promise<boolean> {
  const mapped = await resolveTenantUserId({ to: toE164 });
  if (mapped !== userId) return false;
  return ensurePilotTrial(userId);
}

export async function setUserTwilioBoundMarker(
  userId: string,
  phoneE164: string,
): Promise<void> {
  if (!useKvStore()) return;
  await kv.set(userTwilioBoundKey(userId), phoneE164);
}
