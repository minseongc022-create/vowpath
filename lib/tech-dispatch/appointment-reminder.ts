/**
 * 30-minute pre-appointment reminder flow:
 * 1. 30 min before window start → SMS tech asking ETA
 * 2. If tech replies with minutes → SMS customer with ETA
 * 3. If no reply by window start → SMS customer "on the way" fallback
 */

import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import { kvGetSafe } from "../kv-safe";
import { listCallLogs } from "../call-logs";
import { listJobs } from "../jobs-db";
import { listUsers } from "../users-db";
import { findUserById } from "../users-db";
import { resolveShopDisplayName } from "../link-intake-brand";
import { sendSms } from "../send-sms";
import { sendTechSms } from "./send-tech-sms";
import { getTechDispatchSettings, getTechAssignment } from "./store";
import {
  smsApptReminderToTech,
  smsApptEtaToCustomer,
  smsApptFallbackToCustomer,
} from "../sms-templates";

export type ApptReminderState = {
  sentAt: string;        // ISO — when we asked the tech for ETA
  etaMinutes?: number;   // filled when tech replies
  etaSentAt?: string;    // when we forwarded ETA to customer
  fallbackSentAt?: string; // when we sent fallback (no reply)
  customerPhone?: string;
  techId?: string;
};

function reminderKey(userId: string, bookingId: string) {
  return `effiroad:appt-reminder:${userId}:${bookingId}`;
}

async function getReminderState(userId: string, bookingId: string): Promise<ApptReminderState | null> {
  if (useKvStore()) {
    return kvGetSafe<ApptReminderState>(reminderKey(userId, bookingId));
  }
  return null;
}

async function saveReminderState(userId: string, bookingId: string, state: ApptReminderState) {
  if (useKvStore()) {
    // TTL 48 hours — reminder state is short-lived
    await kv.set(reminderKey(userId, bookingId), state, { ex: 60 * 60 * 48 });
  }
}

/**
 * Parse "8:00 AM – 9:00 AM", "8-9 AM", "8 AM – 9 AM", "Mon 8-9 AM" etc.
 * Returns the start hour (0-23) for today, or null if unparseable.
 */
export function parseWindowStartHour(window: string): number | null {
  if (!window || window === "TBD") return null;

  // Strip weekday prefix (Mon, Tuesday, etc.)
  const stripped = window.replace(/^(mon|tue|wed|thu|fri|sat|sun)\w*\.?\s*/i, "");

  // Match: "8:30 AM", "8 AM", "8:00 AM – 9:00 AM", "8-9 AM", "8–10 AM"
  const match = stripped.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  // Heuristic: no meridiem, hour <= 7 → probably PM (restoration jobs rarely at 7 AM)
  if (!meridiem && hour >= 1 && hour <= 7) hour += 12;

  return hour * 60 + minutes; // return minutes-since-midnight for precision
}

/** Returns minutes since midnight for now (in the server's local timezone). */
function nowMinutesSinceMidnight(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

type BookingEntry = {
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  arrivalWindow: string;
  techId?: string | null;
  techPhone?: string | null;
};

const WEEKDAY_PREFIX = /^(sun|mon|tue|wed|thu|fri|sat)\w*\.?\s/i;

function isArrivalWindowToday(window: string): boolean {
  const trimmed = window.trim();
  if (!WEEKDAY_PREFIX.test(trimmed)) return true;
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
  return trimmed.toLowerCase().startsWith(today.toLowerCase());
}

async function loadTodayBookingsForUser(userId: string): Promise<BookingEntry[]> {
  const [calls, jobs] = await Promise.all([listCallLogs(userId), listJobs(userId)]);
  const entries: BookingEntry[] = [];

  for (const call of calls) {
    if (!call.arrivalWindow || call.arrivalWindow === "TBD") continue;
    if (!isArrivalWindowToday(call.arrivalWindow)) continue;
    entries.push({
      bookingId: `call-${call.id}`,
      customerName: call.customerName ?? "Customer",
      customerPhone: call.callbackPhone ?? undefined,
      arrivalWindow: call.arrivalWindow,
    });
  }

  for (const job of jobs) {
    if (!job.arrivalWindow || job.arrivalWindow === "TBD") continue;
    if (!isArrivalWindowToday(job.arrivalWindow)) continue;
    entries.push({
      bookingId: job.id,
      customerName: job.customerName ?? "Customer",
      customerPhone: (job as Record<string, unknown>).customerPhone as string | undefined,
      arrivalWindow: job.arrivalWindow,
    });
  }

  return entries;
}

export async function processApptRemindersForUser(userId: string): Promise<number> {
  const settings = await getTechDispatchSettings(userId);
  if (!settings.enabled || !settings.techs.length) return 0;

  const user = await findUserById(userId);
  const shopName = resolveShopDisplayName(user?.shopName);

  const bookings = await loadTodayBookingsForUser(userId);
  const nowMins = nowMinutesSinceMidnight();
  let sent = 0;

  for (const booking of bookings) {
    const startMins = parseWindowStartHour(booking.arrivalWindow);
    if (startMins === null) continue;

    const minsUntil = startMins - nowMins;

    const state = await getReminderState(userId, booking.bookingId);

    // Step 1: send 30-min reminder to tech (window: 35min → 25min before start)
    if (!state && minsUntil >= 25 && minsUntil <= 35) {
      const assignment = await getTechAssignment(userId, booking.bookingId);
      const tech = assignment?.assignedTechId
        ? settings.techs.find((t) => t.id === assignment.assignedTechId)
        : null;

      if (!tech) continue;

      const body = smsApptReminderToTech({
        customerName: booking.customerName,
        window: booking.arrivalWindow,
        bookingId: booking.bookingId,
      });

      const ok = await sendTechSms({
        userId,
        techPhone: tech.phone,
        body,
        devLogLabel: "appt-reminder-tech",
        operation: "appt_reminder_tech",
        bookingId: booking.bookingId,
      });

      if (ok) {
        await saveReminderState(userId, booking.bookingId, {
          sentAt: new Date().toISOString(),
          customerPhone: booking.customerPhone,
          techId: tech.id,
        });
        sent++;
      }
      continue;
    }

    // Step 2: fallback to customer if tech hasn't replied and window is starting (5 min grace)
    if (
      state &&
      !state.etaSentAt &&
      !state.fallbackSentAt &&
      minsUntil <= 5 &&
      minsUntil >= -10 &&
      state.customerPhone
    ) {
      const assignment = await getTechAssignment(userId, booking.bookingId);
      const tech = assignment?.assignedTechId
        ? settings.techs.find((t) => t.id === assignment.assignedTechId)
        : null;

      const body = smsApptFallbackToCustomer({
        shopName,
        customerName: booking.customerName,
        window: booking.arrivalWindow,
        techName: tech?.name,
      });

      const ok = await sendSms(state.customerPhone, body, "appt-reminder-fallback", {
        context: { userId, operation: "appt_fallback_customer", bookingId: booking.bookingId },
      });

      if (ok.ok) {
        await saveReminderState(userId, booking.bookingId, {
          ...state,
          fallbackSentAt: new Date().toISOString(),
        });
        sent++;
      }
    }
  }

  return sent;
}

/** Called when tech replies with ETA minutes (from SMS reply handler). */
export async function handleApptEtaReply(params: {
  userId: string;
  bookingId: string;
  etaMinutes: number;
  shopName: string;
}): Promise<boolean> {
  const state = await getReminderState(params.userId, params.bookingId);
  if (!state || !state.customerPhone || state.etaSentAt) return false;

  const [calls, jobs] = await Promise.all([
    listCallLogs(params.userId),
    listJobs(params.userId),
  ]);

  let customerName = "there";
  let window = "";

  if (params.bookingId.startsWith("call-")) {
    const call = calls.find((c) => c.id === params.bookingId.slice("call-".length));
    if (call) { customerName = call.customerName ?? "there"; window = call.arrivalWindow ?? ""; }
  } else {
    const job = jobs.find((j) => j.id === params.bookingId);
    if (job) { customerName = job.customerName ?? "there"; window = job.arrivalWindow ?? ""; }
  }

  const body = smsApptEtaToCustomer({
    shopName: params.shopName,
    customerName,
    etaMinutes: params.etaMinutes,
    window,
  });

  const ok = await sendSms(state.customerPhone, body, "appt-eta-customer", {
    context: { userId: params.userId, operation: "appt_eta_customer", bookingId: params.bookingId },
  });

  if (ok.ok) {
    await saveReminderState(params.userId, params.bookingId, {
      ...state,
      etaMinutes: params.etaMinutes,
      etaSentAt: new Date().toISOString(),
    });
    return true;
  }
  return false;
}

export async function processApptRemindersAll(): Promise<{ users: number; sent: number }> {
  const users = await listUsers();
  let sent = 0;
  for (const user of users) {
    sent += await processApptRemindersForUser(user.id);
  }
  return { users: users.length, sent };
}
