/**
 * E2E: 하이브리드 예약 (hybrid)
 * - P2 + confidence ≥ 85 → 자동 scheduled + 고객 확정 문자
 * - P1 → pending_review + 사장 승인 문자 → 승인 후 scheduled + 고객 확정 문자
 * Usage: node scripts/run-hybrid-booking-e2e.mjs [port]
 */
import { readFileSync } from "fs";
import { SignJWT } from "jose";

const port = Number(process.argv[2] || process.env.PORT || 3000);
const base = `http://localhost:${port}`;

const envRaw = readFileSync(".env.local", "utf-8");
const secret =
  envRaw.match(/^AUTH_SECRET=(.+)$/m)?.[1]?.trim() ||
  "dev-only-change-auth-secret-32chars";
const key = new TextEncoder().encode(secret);
const smsPreview =
  envRaw.match(/^SMS_DEV_PREVIEW=(.+)$/m)?.[1]?.trim() === "1" ||
  envRaw.match(/^SMS_DEV_PREVIEW=(.+)$/m)?.[1]?.trim() === "true";

const { users } = JSON.parse(readFileSync("data/users.json", "utf-8"));
const user = users[0];
if (!user) {
  console.error("No users in data/users.json");
  process.exit(1);
}

const token = await new SignJWT({
  email: user.email,
  shopName: user.shopName,
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(user.id)
  .setIssuedAt()
  .setExpirationTime("2592000s")
  .sign(key);

const headers = {
  "Content-Type": "application/json",
  Cookie: `nightcall_session=${token}`,
};

async function api(path, opts = {}) {
  const res = await fetch(`${base}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

function step(label) {
  console.log(`\n── ${label}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function loadSmsDedupe() {
  try {
    return JSON.parse(readFileSync("data/sms-dedupe.json", "utf-8"));
  } catch {
    return {};
  }
}

function assertSmsDedupe(userId, dedupeKey, shouldExist, label) {
  const dedupe = loadSmsDedupe();
  const exists = Boolean(dedupe[userId]?.[dedupeKey]);
  if (shouldExist && !exists && !smsPreview) {
    fail(`${label}: expected SMS dedupe "${dedupeKey}"`);
  }
  if (!shouldExist && exists) {
    fail(`${label}: SMS dedupe "${dedupeKey}" should NOT exist yet`);
  }
  if (exists) {
    console.log(`✓ ${label}: SMS dedupe ${dedupeKey}`);
  } else if (smsPreview && shouldExist) {
    console.log(`✓ ${label}: SMS_DEV_PREVIEW — check dev server [sms] log for ${dedupeKey}`);
  } else if (!shouldExist) {
    console.log(`✓ ${label}: no premature SMS (${dedupeKey})`);
  }
}

async function calendarEventFor(bookingId) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
  const cal = await api(`/api/jobber/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!cal.res.ok) fail(`Calendar API failed: ${cal.res.status}`);
  return (cal.json.events ?? []).find((e) => e.bookingId === bookingId);
}

const stamp = Date.now();

step("1. 하이브리드 모드로 설정");
const settingsPatch = await api("/api/shop/settings", {
  method: "PATCH",
  body: JSON.stringify({
    schedulingEnabled: true,
    schedulingMode: "hybrid",
    shadowModeRemaining: 0,
    ownerApprovalSms: "p1_only",
  }),
});
if (!settingsPatch.res.ok) fail(`Settings PATCH failed: ${JSON.stringify(settingsPatch.json)}`);
if (settingsPatch.json.settings?.schedulingMode !== "hybrid") {
  fail(`Expected schedulingMode hybrid, got ${settingsPatch.json.settings?.schedulingMode}`);
}
console.log("schedulingMode: hybrid, ownerApprovalSms: p1_only");

/* ── P2: auto-schedule ── */
step("2a. P2 일반 예약 시뮬 (자동 확정 기대)");
const p2Speech = `Hi, Hybrid P2 ${stamp}, four five six Oak Avenue, Austin Texas, AC not cooling well, thermostat at seventy-eight, need service this week.`;
const simP2 = await api("/api/dev/simulate-call", {
  method: "POST",
  body: JSON.stringify({
    speech: p2Speech,
    menuPriority: "P2",
    slotIndex: 2,
  }),
});
console.log("Status:", simP2.res.status);
if (!simP2.res.ok) fail(`P2 simulate failed: ${JSON.stringify(simP2.json)}`);
const p2BookingId = simP2.json.bookingId;
if (!p2BookingId) fail("P2: no bookingId");

const p2StatusRes = await api("/api/bookings/status");
const p2Status = p2StatusRes.json.statuses?.[p2BookingId];
if (p2Status !== "scheduled") {
  fail(`P2: expected status "scheduled", got "${p2Status ?? "missing"}"`);
}
console.log(`✓ P2 status: ${p2Status}`);

assertSmsDedupe(user.id, `${p2BookingId}:scheduled`, true, "P2 customer_scheduled");

const p2Event = await calendarEventFor(p2BookingId);
if (!p2Event) fail(`P2: no calendar event for ${p2BookingId}`);
if (p2Event.priority !== "P2") {
  fail(`P2: calendar priority expected P2, got ${p2Event.priority ?? "missing"}`);
}
console.log(`✓ P2 calendar: ${p2Event.timeLabel} — ${p2Event.customerName} — 긴급도 P2`);

/* ── P1: owner approval ── */
step("2b. P1 긴급 예약 시뮬 (검토 대기 기대)");
const p1Speech = `Hi, Hybrid P1 ${stamp}, one two three Main Street, Austin Texas, no cool, indoor eighty-six degrees, two kids at home, need someone tonight.`;
const simP1 = await api("/api/dev/simulate-call", {
  method: "POST",
  body: JSON.stringify({
    speech: p1Speech,
    menuPriority: "P1",
    slotIndex: 3,
  }),
});
console.log("Status:", simP1.res.status);
if (!simP1.res.ok) fail(`P1 simulate failed: ${JSON.stringify(simP1.json)}`);
const p1BookingId = simP1.json.bookingId;
if (!p1BookingId) fail("P1: no bookingId");

const p1StatusRes = await api("/api/bookings/status");
const p1StatusBefore = p1StatusRes.json.statuses?.[p1BookingId];
if (p1StatusBefore !== "pending_review") {
  fail(`P1: expected status "pending_review", got "${p1StatusBefore ?? "missing"}"`);
}
console.log(`✓ P1 status before approve: ${p1StatusBefore}`);

assertSmsDedupe(user.id, `${p1BookingId}:scheduled`, false, "P1 no premature customer_scheduled");
assertSmsDedupe(user.id, `${p1BookingId}:owner_approval`, true, "P1 owner_approval_needed");

const p1EventBefore = await calendarEventFor(p1BookingId);
if (!p1EventBefore) fail(`P1: no calendar event before approve for ${p1BookingId}`);
if (p1EventBefore.priority !== "P1") {
  fail(`P1: calendar priority expected P1, got ${p1EventBefore.priority ?? "missing"}`);
}
console.log(`✓ P1 calendar (pending): ${p1EventBefore.timeLabel} — 긴급도 P1`);

step("3. P1 사장 승인 → scheduled + 고객 문자");
const approve = await api("/api/bookings/status", {
  method: "PATCH",
  body: JSON.stringify({ id: p1BookingId, status: "approved" }),
});
if (!approve.res.ok) fail(`Approve PATCH failed: ${JSON.stringify(approve.json)}`);

const p1StatusAfter = approve.json.statuses?.[p1BookingId] ?? approve.json.status;
if (p1StatusAfter !== "scheduled") {
  fail(`P1 after approve: expected "scheduled", got "${p1StatusAfter ?? "missing"}"`);
}
console.log(`✓ P1 status after approve: ${p1StatusAfter}`);

assertSmsDedupe(user.id, `${p1BookingId}:scheduled`, true, "P1 customer_scheduled after approve");

console.log("\n✅ 하이브리드 E2E 완료");
console.log(`   P2 (auto):  ${p2BookingId} → scheduled, priority P2 on calendar`);
console.log(`   P1 (approve): ${p1BookingId} → pending_review → scheduled, priority P1 on calendar`);
