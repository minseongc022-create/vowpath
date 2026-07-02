import { listOperationFailures } from "./ops-failures";
import { sendSms } from "./send-sms";
import { findUserById } from "./users-db";

/**
 * SMS alerts to the *site* owner's personal phone (OWNER_ALERT_PHONE) — distinct from
 * per-tenant shop-owner alerts elsewhere in the app. Used for system-level health
 * events (OpenAI/Twilio outages, repeated call failures) so one person can keep an eye
 * on the whole platform without watching the dashboard.
 */
function getOwnerAlertPhone(): string | null {
  return process.env.OWNER_ALERT_PHONE?.trim() || null;
}

/** Sends a raw SMS to the site owner. No-ops (with a console warning) if unconfigured. */
export async function alertOwner(message: string): Promise<void> {
  const phone = getOwnerAlertPhone();
  if (!phone) {
    console.warn("[owner-alerts] OWNER_ALERT_PHONE not set — skipped:", message);
    return;
  }
  const result = await sendSms(phone, message, "owner-alert");
  if (!result.ok) {
    console.error("[owner-alerts] failed to notify site owner:", result.error);
  }
}

export type CriticalAlertType = "openai_down" | "sms_failed" | "call_errors" | "new_signup";

/** Same (type, message) pair is sent at most once per window — avoids alert storms. */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const recentAlerts = new Map<string, number>();

function shouldSend(type: CriticalAlertType, message: string): boolean {
  const key = `${type}|${message}`;
  const now = Date.now();
  const last = recentAlerts.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recentAlerts.set(key, now);
  return true;
}

/** Immediate SMS alert for a critical platform event. `message` should be the full,
 * already-formatted text (including emoji prefix) — see callers for examples. */
export async function alertCritical(type: CriticalAlertType, message: string): Promise<void> {
  if (!shouldSend(type, message)) return;
  await alertOwner(message);
}

const TERMINAL_CALL_STATUSES = new Set(["completed", "failed", "busy", "no-answer", "canceled"]);

/** In-memory streak of consecutive calls that ended in error, across all tenants —
 * see resilience.ts for the same per-instance caveat. Reset by any clean call. */
let consecutiveCallErrors = 0;

async function callHadLoggedFailure(userId: string, callSid: string): Promise<boolean> {
  const failures = await listOperationFailures(userId, 30);
  return failures.some(
    (f) => f.callSid === callSid && (f.category === "ai" || f.category === "intake"),
  );
}

/** Call once per terminal call-status webhook event. Fires a site-owner alert once
 * 3 calls in a row end in error (Twilio-level failure, or an intake/AI failure that
 * was logged for that callSid even though the call itself "completed"). */
export async function trackCallOutcomeForAlert(params: {
  userId: string;
  callSid: string;
  status: string;
}): Promise<void> {
  if (!TERMINAL_CALL_STATUSES.has(params.status)) return;

  const erroredOut =
    params.status !== "completed" || (await callHadLoggedFailure(params.userId, params.callSid));

  if (!erroredOut) {
    consecutiveCallErrors = 0;
    return;
  }

  consecutiveCallErrors += 1;
  if (consecutiveCallErrors < 3) return;

  const streak = consecutiveCallErrors;
  consecutiveCallErrors = 0;
  const user = await findUserById(params.userId);
  const label = user?.shopName ? ` (latest: ${user.shopName})` : "";
  await alertCritical(
    "call_errors",
    `🚨 CRITICAL: ${streak} consecutive calls ended in error${label}. Check dashboard.`,
  );
}
