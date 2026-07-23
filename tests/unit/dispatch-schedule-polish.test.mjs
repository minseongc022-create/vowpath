import assert from "node:assert/strict";
import test from "node:test";

import {
  earliestStartAfterVisit,
  schedulingGapMinutes,
} from "../../lib/scheduling/scheduling-gap.ts";
import {
  effectiveOfferTimeoutMinutes,
  shouldAutoStartTechDispatch,
} from "../../lib/tech-dispatch/policy.ts";
import { minutesSinceMidnightInTimezone, dayOfWeekInTimezone } from "../../lib/us-timezone.ts";

/** Mirrors patchAppointmentInterval — keep travel, put remainder into duration. */
function patchAppointmentInterval(intervalMinutes, travelMinutes = 30) {
  const interval = Math.min(720, Math.max(15, Math.round(intervalMinutes)));
  const travel = Math.min(240, Math.max(0, Math.round(travelMinutes)));
  const travelUsed = Math.min(travel, Math.max(0, interval - 15));
  return { defaultDurationMinutes: Math.max(15, interval - travelUsed), slotBufferMinutes: 0 };
}

function appointmentIntervalMinutes(settings) {
  return Math.max(
    15,
    settings.defaultDurationMinutes + schedulingGapMinutes(settings),
  );
}

function isOvernight(row) {
  const start = row.startHour * 60 + row.startMinute;
  const end = row.endHour * 60 + row.endMinute;
  return end <= start;
}

/** Overnight-aware row check (same rules as missed-calls-prevented). */
function isWithinScheduleRow(iso, row, timeZone) {
  const d = new Date(iso);
  const mins = minutesSinceMidnightInTimezone(timeZone, d);
  const startMins = row.startHour * 60 + row.startMinute;
  const endMins = row.endHour * 60 + row.endMinute;
  const day = dayOfWeekInTimezone(timeZone, d);
  if (!isOvernight(row)) {
    if (!row.days.includes(day)) return false;
    return mins >= startMins && mins < endMins;
  }
  if (row.days.includes(day) && mins >= startMins) return true;
  const prevDay = (day + 6) % 7;
  if (row.days.includes(prevDay) && mins < endMins) return true;
  return false;
}

function shouldAnswerNow(profile, now = new Date()) {
  if (!profile.answerScheduleActive) return false;
  if (profile.scheduleAlwaysOn) return true;
  const stored = Array.isArray(profile.scheduleWindows) ? profile.scheduleWindows : [];
  if (stored.length === 0) return false;
  return stored.some((w) => {
    try {
      const payload = JSON.parse(w.value);
      if (payload.alwaysOn) return true;
      return isWithinScheduleRow(now.toISOString(), payload, profile.shopTimezone);
    } catch {
      return false;
    }
  });
}

test("patchAppointmentInterval keeps travel so slot spacing matches selection", () => {
  const patched = patchAppointmentInterval(120, 30);
  assert.equal(patched.defaultDurationMinutes, 90);
  assert.equal(patched.slotBufferMinutes, 0);
  assert.equal(
    appointmentIntervalMinutes({
      defaultDurationMinutes: patched.defaultDurationMinutes,
      slotBufferMinutes: patched.slotBufferMinutes,
      travelMinutes: 30,
    }),
    120,
  );
});

test("patchAppointmentInterval with zero travel uses full interval as duration", () => {
  const patched = patchAppointmentInterval(90, 0);
  assert.equal(patched.defaultDurationMinutes, 90);
  assert.equal(appointmentIntervalMinutes({ ...patched, travelMinutes: 0 }), 90);
});

test("gap after visit blocks back-to-back when travel is set", () => {
  const gapMs = schedulingGapMinutes({ slotBufferMinutes: 0, travelMinutes: 30 }) * 60_000;
  const end = new Date("2026-07-15T15:00:00.000Z").getTime();
  assert.equal(earliestStartAfterVisit(end, gapMs), end + 30 * 60_000);
});

test("tech dispatch: assignOnApprove on waits for approved/scheduled", () => {
  const settings = { enabled: true, assignOnApprove: true };
  assert.equal(shouldAutoStartTechDispatch(settings, "approved"), true);
  assert.equal(shouldAutoStartTechDispatch(settings, "scheduled"), true);
  assert.equal(
    shouldAutoStartTechDispatch(settings, "pending_review", { hasScheduledSlot: true }),
    false,
  );
});

test("tech dispatch: assignOnApprove off texts when slot reserved", () => {
  const settings = { enabled: true, assignOnApprove: false };
  assert.equal(
    shouldAutoStartTechDispatch(settings, "pending_review", { hasScheduledSlot: true }),
    true,
  );
  assert.equal(
    shouldAutoStartTechDispatch(settings, "pending_review", { hasScheduledSlot: false }),
    false,
  );
  assert.equal(shouldAutoStartTechDispatch(settings, "scheduled"), true);
});

test("tech dispatch: disabled never auto-starts", () => {
  assert.equal(
    shouldAutoStartTechDispatch({ enabled: false, assignOnApprove: false }, "scheduled"),
    false,
  );
});

test("P1 offer timeout caps at 5 minutes", () => {
  assert.equal(effectiveOfferTimeoutMinutes(10, "P1"), 5);
  assert.equal(effectiveOfferTimeoutMinutes(10, "P2"), 10);
});

test("AI schedule overnight window spans midnight in shop TZ", () => {
  const overnight = {
    days: [1, 2, 3, 4, 5],
    startHour: 17,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  };
  // Mon Jul 13 2026 10pm EDT
  assert.equal(
    isWithinScheduleRow("2026-07-14T02:00:00.000Z", overnight, "America/New_York"),
    true,
  );
  // Tue Jul 14 2026 7am EDT (still overnight from Mon)
  assert.equal(
    isWithinScheduleRow("2026-07-14T11:00:00.000Z", overnight, "America/New_York"),
    true,
  );
  // Tue Jul 14 2026 10am EDT — outside
  assert.equal(
    isWithinScheduleRow("2026-07-14T14:00:00.000Z", overnight, "America/New_York"),
    false,
  );
});

test("shouldAnswerNow: active with empty windows does not invent defaults", () => {
  assert.equal(
    shouldAnswerNow({
      answerScheduleActive: true,
      scheduleAlwaysOn: false,
      scheduleWindows: [],
      shopTimezone: "America/New_York",
    }),
    false,
  );
});

test("shouldAnswerNow: always-on flag answers", () => {
  assert.equal(
    shouldAnswerNow({
      answerScheduleActive: true,
      scheduleAlwaysOn: true,
      scheduleWindows: [],
      shopTimezone: "America/Chicago",
    }),
    true,
  );
});
