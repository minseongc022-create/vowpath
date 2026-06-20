/**
 * Smart auto-book E2E — P2 auto-schedule, P1 owner approval, ambiguous hold, owner SMS 1/2.
 * Usage: node scripts/run-smart-booking-e2e.mjs [port]
 */
import {
  ensureDevUser,
  apiFetch,
  assertSmsDedupe,
} from "./lib/e2e-session.mjs";

const port = Number(process.argv[2] || process.env.PORT || 3000);
const base = `http://localhost:${port}`;
const user = ensureDevUser();

function step(label) {
  console.log(`\n── ${label}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function calendarEventFor(bookingId) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
  const cal = await apiFetch(
    base,
    `/api/jobber/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    user,
  );
  if (!cal.res.ok) fail(`Calendar API failed: ${cal.res.status}`);
  return (cal.json.events ?? []).find((e) => e.bookingId === bookingId);
}

const stamp = Date.now();

step("0. Health check");
const health = await fetch(`${base}/api/me`, { method: "GET" });
if (!health.ok && health.status !== 401) {
  fail(`Dev server not reachable at ${base} — run npm run dev first`);
}

step("1. Smart auto-book settings");
const settingsPatch = await apiFetch(base, "/api/shop/settings", user, {
  method: "PATCH",
  body: JSON.stringify({
    schedulingEnabled: true,
    schedulingMode: "hybrid",
    shadowModeRemaining: 0,
    ownerApprovalSms: "p1_only",
    nativeCalendarEnabled: true,
  }),
});
if (!settingsPatch.res.ok) {
  fail(`Settings PATCH failed: ${JSON.stringify(settingsPatch.json)}`);
}
const mode = settingsPatch.json.settings?.schedulingMode;
if (mode !== "auto") {
  fail(`Expected schedulingMode "auto", got "${mode ?? "missing"}"`);
}
console.log("schedulingMode: auto (smart), shadow: 0");

/* P2 auto */
step("2a. P2 — auto scheduled + customer SMS");
const p2Speech = `Hi, Smart P2 ${stamp}, four five six Oak Avenue, Austin Texas 78701, AC not cooling well, thermostat at seventy-eight, need service this week.`;
const simP2 = await apiFetch(base, "/api/dev/simulate-call", user, {
  method: "POST",
  body: JSON.stringify({ speech: p2Speech, menuPriority: "P2", slotIndex: 2 }),
});
if (!simP2.res.ok) fail(`P2 simulate failed: ${JSON.stringify(simP2.json)}`);
const p2BookingId = simP2.json.bookingId;
if (!p2BookingId) fail("P2: no bookingId");

const p2StatusRes = await apiFetch(base, "/api/bookings/status", user);
const p2Status = p2StatusRes.json.statuses?.[p2BookingId];
if (p2Status !== "scheduled") {
  fail(`P2: expected "scheduled", got "${p2Status ?? "missing"}"`);
}
console.log(`✓ P2 status: ${p2Status}`);
assertSmsDedupe(user.id, `${p2BookingId}:scheduled`, true, "P2 customer_scheduled", fail);

const p2Event = await calendarEventFor(p2BookingId);
if (!p2Event) fail(`P2: no calendar event`);
console.log(`✓ P2 calendar: ${p2Event.timeLabel}`);

/* P1 owner approval */
step("2b. P1 — pending_review + owner approval SMS");
const p1Speech = `Hi, Smart P1 ${stamp}, one two three Main Street, Austin Texas 78701, no cool, indoor eighty-six degrees, two kids at home, need someone tonight.`;
const simP1 = await apiFetch(base, "/api/dev/simulate-call", user, {
  method: "POST",
  body: JSON.stringify({ speech: p1Speech, menuPriority: "P1", slotIndex: 3 }),
});
if (!simP1.res.ok) fail(`P1 simulate failed: ${JSON.stringify(simP1.json)}`);
const p1BookingId = simP1.json.bookingId;
if (!p1BookingId) fail("P1: no bookingId");

const p1Before = (await apiFetch(base, "/api/bookings/status", user)).json.statuses?.[
  p1BookingId
];
if (p1Before !== "pending_review") {
  fail(`P1: expected "pending_review", got "${p1Before ?? "missing"}"`);
}
console.log(`✓ P1 status before approve: ${p1Before}`);
assertSmsDedupe(user.id, `${p1BookingId}:scheduled`, false, "P1 no premature customer_scheduled", fail);
assertSmsDedupe(user.id, `${p1BookingId}:owner_approval`, true, "P1 owner_approval_needed", fail);

step("3. Owner SMS reply 1 → scheduled + customer SMS");
const ownerReply = await apiFetch(base, "/api/dev/owner-sms-reply", user, {
  method: "POST",
  body: JSON.stringify({ bookingId: p1BookingId, body: "1" }),
});
if (!ownerReply.res.ok) fail(`Owner reply failed: ${JSON.stringify(ownerReply.json)}`);
if (!ownerReply.json.handled) fail(`Owner reply not handled: ${ownerReply.json.replyBody}`);
const p1After = ownerReply.json.status ?? ownerReply.json.statuses?.[p1BookingId];
if (p1After !== "scheduled" && p1After !== "approved") {
  fail(`P1 after approve: expected scheduled/approved, got "${p1After ?? "missing"}"`);
}
console.log(`✓ P1 after owner 1: ${p1After}`);
assertSmsDedupe(user.id, `${p1BookingId}:scheduled`, true, "P1 customer_scheduled after approve", fail);

/* Ambiguous intake */
step("4. Low-confidence intake → pending_review");
const fuzzySpeech = `Hi, need help, somewhere in Austin, thing not working.`;
const simFuzzy = await apiFetch(base, "/api/dev/simulate-call", user, {
  method: "POST",
  body: JSON.stringify({ speech: fuzzySpeech, menuPriority: "P3", slotIndex: 1 }),
});
if (!simFuzzy.res.ok) fail(`Fuzzy simulate failed: ${JSON.stringify(simFuzzy.json)}`);
const fuzzyId = simFuzzy.json.bookingId;
const fuzzyStatus = (await apiFetch(base, "/api/bookings/status", user)).json.statuses?.[fuzzyId];
if (fuzzyStatus !== "pending_review") {
  fail(`Fuzzy: expected "pending_review", got "${fuzzyStatus ?? "missing"}"`);
}
console.log(`✓ Fuzzy intake held for review: ${fuzzyId}`);

step("5. Owner SMS reply 2 (reject) on fuzzy booking");
const reject = await apiFetch(base, "/api/dev/owner-sms-reply", user, {
  method: "POST",
  body: JSON.stringify({ bookingId: fuzzyId, body: "2" }),
});
if (!reject.res.ok) fail(`Reject failed: ${JSON.stringify(reject.json)}`);
if (!reject.json.handled) fail(`Reject not handled`);
const fuzzyAfter = reject.json.status ?? reject.json.statuses?.[fuzzyId];
if (fuzzyAfter !== "rejected") {
  fail(`Fuzzy after reject: expected "rejected", got "${fuzzyAfter ?? "missing"}"`);
}
console.log(`✓ Fuzzy after reject: ${fuzzyAfter}`);

step("6. Owner SMS reply 9 → undo P2 auto-book");
const undo = await apiFetch(base, "/api/dev/owner-sms-reply", user, {
  method: "POST",
  body: JSON.stringify({ bookingId: p2BookingId, body: "9" }),
});
if (!undo.res.ok) fail(`Undo failed: ${JSON.stringify(undo.json)}`);
if (!undo.json.handled) fail(`Undo not handled: ${undo.json.replyBody}`);
const p2Undone = undo.json.status ?? undo.json.statuses?.[p2BookingId];
if (p2Undone !== "pending_review") {
  fail(`P2 after undo: expected "pending_review", got "${p2Undone ?? "missing"}"`);
}
console.log(`✓ P2 undone → ${p2Undone}`);

console.log("\n✅ Smart auto-book E2E complete");
console.log(`   P2 auto:     ${p2BookingId}`);
console.log(`   P1 approve:  ${p1BookingId}`);
console.log(`   Fuzzy reject:${fuzzyId}`);
