/**
 * E2E: 수동 승인 (control)
 * - P2/P3 모두 슬롯 선택 후 pending_review (자동 확정 없음)
 * - 고객 확정 문자는 승인 전까지 없음
 * - 사장 승인 문자는 P2·P3 모두 (control + p1_only여도 전송)
 * - 승인 → scheduled + 고객 문자 / 거절 → rejected
 * Usage: node scripts/run-control-booking-e2e.mjs [port]
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

function assertStatus(bookingId, expected, label) {
  return api("/api/bookings/status").then((res) => {
    if (!res.res.ok) fail(`${label}: status API failed`);
    const actual = res.json.statuses?.[bookingId];
    if (actual !== expected) {
      fail(`${label}: expected "${expected}", got "${actual ?? "missing"}"`);
    }
    console.log(`✓ ${label}: ${actual}`);
  });
}

const stamp = Date.now();

step("1. 수동 승인(control) 모드로 설정");
const settingsPatch = await api("/api/shop/settings", {
  method: "PATCH",
  body: JSON.stringify({
    schedulingEnabled: true,
    schedulingMode: "control",
    shadowModeRemaining: 0,
    ownerApprovalSms: "p1_only",
  }),
});
if (!settingsPatch.res.ok) fail(`Settings PATCH failed: ${JSON.stringify(settingsPatch.json)}`);
if (settingsPatch.json.settings?.schedulingMode !== "control") {
  fail(`Expected schedulingMode control, got ${settingsPatch.json.settings?.schedulingMode}`);
}
console.log("schedulingMode: control, ownerApprovalSms: p1_only");

/* ── P2: always pending in control ── */
step("2a. P2 예약 시뮬 (검토 대기 — 자동 확정 없음)");
const p2Speech = `Hi, Control P2 ${stamp}, four five six Oak Avenue, Austin Texas, AC not cooling well, thermostat at seventy-eight, need service this week.`;
const simP2 = await api("/api/dev/simulate-call", {
  method: "POST",
  body: JSON.stringify({
    speech: p2Speech,
    menuPriority: "P2",
    slotIndex: 1,
  }),
});
if (!simP2.res.ok) fail(`P2 simulate failed: ${JSON.stringify(simP2.json)}`);
if (simP2.json.schedulingMode !== "control") {
  fail(`P2: expected schedulingMode control, got ${simP2.json.schedulingMode}`);
}
const p2BookingId = simP2.json.bookingId;
if (!p2BookingId) fail("P2: no bookingId");
console.log(`bookingId: ${p2BookingId}, slot: ${simP2.json.selectedSlot?.label ?? "none"}`);

await assertStatus(p2BookingId, "pending_review", "P2 status after slot pick");
assertSmsDedupe(user.id, `${p2BookingId}:scheduled`, false, "P2 no premature customer_scheduled");
assertSmsDedupe(user.id, `${p2BookingId}:owner_approval`, true, "P2 owner_approval (control forces SMS)");

const p2Event = await calendarEventFor(p2BookingId);
if (!p2Event) fail(`P2: no calendar event for ${p2BookingId}`);
if (p2Event.priority !== "P2") fail(`P2: calendar priority expected P2, got ${p2Event.priority}`);
console.log(`✓ P2 calendar: ${p2Event.timeLabel} — 긴급도 P2`);

step("2b. P2 사장 승인 → scheduled + 고객 문자");
const approveP2 = await api("/api/bookings/status", {
  method: "PATCH",
  body: JSON.stringify({ id: p2BookingId, status: "approved" }),
});
if (!approveP2.res.ok) fail(`P2 approve failed: ${JSON.stringify(approveP2.json)}`);
const p2After = approveP2.json.statuses?.[p2BookingId] ?? approveP2.json.status;
if (p2After !== "scheduled") fail(`P2 after approve: expected scheduled, got ${p2After}`);
console.log(`✓ P2 after approve: ${p2After}`);
assertSmsDedupe(user.id, `${p2BookingId}:scheduled`, true, "P2 customer_scheduled after approve");

/* ── P3: reject path ── */
step("3a. P3 예약 시뮬 (검토 대기)");
const p3Speech = `Hi, Control P3 ${stamp}, seven eight nine Pine Road, Austin Texas, annual maintenance check, filter replacement, routine visit next week.`;
const simP3 = await api("/api/dev/simulate-call", {
  method: "POST",
  body: JSON.stringify({
    speech: p3Speech,
    menuPriority: "P3",
    slotIndex: 2,
  }),
});
if (!simP3.res.ok) fail(`P3 simulate failed: ${JSON.stringify(simP3.json)}`);
const p3BookingId = simP3.json.bookingId;
if (!p3BookingId) fail("P3: no bookingId");

await assertStatus(p3BookingId, "pending_review", "P3 status after slot pick");
assertSmsDedupe(user.id, `${p3BookingId}:scheduled`, false, "P3 no premature customer_scheduled");
assertSmsDedupe(user.id, `${p3BookingId}:owner_approval`, true, "P3 owner_approval (control)");

const p3Event = await calendarEventFor(p3BookingId);
if (!p3Event) fail(`P3: no calendar event for ${p3BookingId}`);
if (p3Event.priority !== "P3") fail(`P3: calendar priority expected P3, got ${p3Event.priority}`);
console.log(`✓ P3 calendar: ${p3Event.timeLabel} — 긴급도 P3`);

step("3b. P3 사장 거절 → rejected, 고객 확정 문자 없음");
const rejectP3 = await api("/api/bookings/status", {
  method: "PATCH",
  body: JSON.stringify({ id: p3BookingId, status: "rejected" }),
});
if (!rejectP3.res.ok) fail(`P3 reject failed: ${JSON.stringify(rejectP3.json)}`);
const p3After = rejectP3.json.statuses?.[p3BookingId] ?? rejectP3.json.status;
if (p3After !== "rejected") fail(`P3 after reject: expected rejected, got ${p3After}`);
console.log(`✓ P3 after reject: ${p3After}`);
assertSmsDedupe(user.id, `${p3BookingId}:scheduled`, false, "P3 no customer_scheduled after reject");

console.log("\n✅ 수동 승인(control) E2E 완료");
console.log(`   P2 approve: ${p2BookingId} → pending_review → scheduled`);
console.log(`   P3 reject:  ${p3BookingId} → pending_review → rejected`);
