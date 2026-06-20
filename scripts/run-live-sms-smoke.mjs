/**
 * Live SMS smoke — sends real Twilio messages (body.live=true bypasses SMS_DEV_PREVIEW).
 * Usage: node scripts/run-live-sms-smoke.mjs [toE164] [port]
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { loadEnvLocal } from "./lib/load-env.mjs";
import { ensureDevUser, apiFetch } from "./lib/e2e-session.mjs";
import twilio from "twilio";

loadEnvLocal();

function normalizeSmsPhone(input) {
  const trimmed = String(input ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("010")) return `+82${digits.slice(1)}`;
  return null;
}

const port = Number(process.argv[3] || process.env.PORT || 3000);
const base = `http://localhost:${port}`;
const probe =
  normalizeSmsPhone(process.argv[2]) ||
  normalizeSmsPhone(process.env.SMS_PROBE_TO) ||
  normalizeSmsPhone(process.env.TWILIO_OWNER_ALERT_PHONE) ||
  "+821055969438";

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();
if (!sid || !token) {
  console.error("Missing Twilio credentials");
  process.exit(1);
}

const client = twilio(sid, token);
const acc = await client.api.accounts(sid).fetch();
console.log(`Twilio: ${acc.status}, type: ${acc.type}, balance check via npm run twilio:status`);

const user = ensureDevUser();
const usersPath = join(process.cwd(), "data", "users.json");
const store = JSON.parse(readFileSync(usersPath, "utf8"));
const idx = store.users.findIndex((u) => u.id === user.id);
if (idx >= 0 && store.users[idx].phone !== probe) {
  store.users[idx].phone = probe;
  writeFileSync(usersPath, JSON.stringify(store, null, 2));
  console.log("[live] Dev owner phone set for owner SMS flows");
}

const health = await fetch(base).catch(() => null);
if (!health?.ok && health?.status !== 404) {
  console.error(`Dev server not running at ${base} — run npm run dev`);
  process.exit(1);
}

const FLOWS = [
  "owner_approval_needed",
  "customer_scheduled",
  "customer_booking_confirmation",
  "link_intake",
];

console.log(`\nLive SMS (${FLOWS.length} templates) → ${probe}\n`);

const res = await apiFetch(base, "/api/dev/sms-smoke", user, {
  method: "POST",
  body: JSON.stringify({ flows: FLOWS, live: true, targetPhone: probe }),
});

if (!res.res.ok) {
  console.error("sms-smoke failed:", res.json);
  process.exit(1);
}

let ok = 0;
for (const r of res.json.results ?? []) {
  if (r.ok) {
    console.log(`✓ ${r.flow}${r.preview ? " (preview — dev server needs restart)" : ""}`);
    ok++;
  } else {
    console.error(`✗ ${r.flow}: ${r.error}`);
  }
}

if (ok !== FLOWS.length) process.exit(1);
console.log("\n✅ Live template SMS sent — check your phone.");
