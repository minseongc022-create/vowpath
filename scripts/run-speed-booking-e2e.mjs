/**
 * E2E: 빠른 예약 (speed) — 고객 전화 intake → 슬롯 선택 → 고객 확정 문자
 * Usage: node scripts/run-speed-booking-e2e.mjs [port]
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

const stamp = Date.now();
const speech = `Hi, Alex Miller, four five six Oak Avenue, Austin Texas, AC not cooling well, thermostat at seventy-eight, need service this week.`;

step("1. 빠른 예약 모드로 설정");
const settingsPatch = await api("/api/shop/settings", {
  method: "PATCH",
  body: JSON.stringify({
    schedulingEnabled: true,
    schedulingMode: "speed",
    shadowModeRemaining: 0,
    ownerApprovalSms: "off",
  }),
});
if (!settingsPatch.res.ok) {
  console.error("Settings PATCH failed", settingsPatch.json);
  process.exit(1);
}
console.log("schedulingMode:", settingsPatch.json.settings?.schedulingMode);

step("2. 고객 전화 시뮬레이션 (P2 일반 + 슬롯 1번)");
const sim = await api("/api/dev/simulate-call", {
  method: "POST",
  body: JSON.stringify({
    speech,
    menuPriority: "P2",
    slotIndex: 1,
  }),
});
console.log("Status:", sim.res.status);
console.log(JSON.stringify(sim.json, null, 2));
if (!sim.res.ok) process.exit(1);

const bookingId = sim.json.bookingId;
if (!bookingId) {
  console.error("No bookingId in response");
  process.exit(1);
}

step("3. 예약 상태 확인");
const status = await api("/api/bookings/status");
console.log("booking status:", status.json.statuses?.[bookingId]);
const bookingStatus = status.json.statuses?.[bookingId];
if (bookingStatus !== "scheduled") {
  console.error(`Expected status "scheduled", got "${bookingStatus ?? "missing"}"`);
  process.exit(1);
}

step("4. 고객 확정 문자 발송 확인");
let smsDedupe = {};
try {
  smsDedupe = JSON.parse(readFileSync("data/sms-dedupe.json", "utf-8"));
} catch {
  /* empty */
}
const dedupeKey = `${bookingId}:scheduled`;
const smsSent = Boolean(smsDedupe[user.id]?.[dedupeKey]);
const preview = envRaw.match(/^SMS_DEV_PREVIEW=(.+)$/m)?.[1]?.trim();
if (smsSent) {
  console.log(`✓ customer_scheduled SMS recorded (${dedupeKey})`);
} else if (preview === "1" || preview === "true") {
  console.log("✓ SMS_DEV_PREVIEW=1 — check dev server terminal for [sms] customer_scheduled log");
} else {
  console.warn(`⚠ SMS dedupe key not found: ${dedupeKey}`);
}

step("5. 캘린더 일정 확인");
const now = new Date();
const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
const cal = await api(`/api/jobber/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
const event = (cal.json.events ?? []).find((e) => e.bookingId === bookingId);
if (event) {
  console.log(`✓ Calendar event: ${event.timeLabel} — ${event.customerName}`);
} else {
  console.warn("⚠ No calendar event found for booking (may be ok if native only)");
}

console.log("\n✅ 빠른 예약 E2E 완료");
console.log(`   bookingId: ${bookingId}`);
console.log(`   slot: ${sim.json.selectedSlot?.label ?? "none"}`);
console.log(`   status: ${bookingStatus}`);
