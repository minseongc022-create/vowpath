/**
 * SMS / Twilio diagnostic (loads .env.local)
 * Usage: node scripts/sms-diagnose.mjs [toE164]
 */
import { readFileSync } from "fs";
import { join } from "path";
import twilio from "twilio";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeSmsPhone(input) {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("010")) return `+82${digits.slice(1)}`;
  return null;
}

loadEnvLocal();

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();
const from = normalizeSmsPhone(process.env.TWILIO_PHONE_NUMBER?.trim() ?? "");
function isKrTest() {
  return (
    process.env.SMS_ALLOW_KR_RECIPIENTS === "1" ||
    process.env.SMS_ALLOW_KR_RECIPIENTS === "true"
  );
}

const probeEnv = normalizeSmsPhone(process.env.SMS_PROBE_TO?.trim() ?? "");
const testTo =
  process.argv[2]?.trim() || probeEnv || (isKrTest() ? null : "+15125550100");

console.log("--- env ---");
console.log("configured:", Boolean(sid && token && from));
console.log("from:", from);
console.log("SMS_DEV_PREVIEW:", process.env.SMS_DEV_PREVIEW ?? "(unset)");
console.log("SMS_ALLOW_KR_RECIPIENTS:", process.env.SMS_ALLOW_KR_RECIPIENTS ?? "(unset)");
console.log("testTo:", testTo ?? "(not set)");

if (!sid || !token || !from) {
  console.log("FAIL: missing Twilio env");
  process.exit(1);
}

if (!from.startsWith("+1")) {
  console.log("FAIL: from must be US +1");
  process.exit(1);
}

if (!testTo) {
  console.log(
    "KR test mode: set SMS_PROBE_TO in .env.local or run:",
  );
  console.log("  node scripts/sms-diagnose.mjs +821012345678");
  process.exit(1);
}

if (!testTo.startsWith("+1") && !testTo.startsWith("+82")) {
  console.log("WARN: use +1 (US) or +82 (KR) E.164:", testTo);
}

const client = twilio(sid, token);

try {
  const acc = await client.api.accounts(sid).fetch();
  console.log("account:", acc.friendlyName, acc.status);
} catch (e) {
  console.log("account_fetch_error:", e.message);
}

try {
  const msg = await client.messages.create({
    body: "[Vowpath] SMS diagnose OK",
    from,
    to: testTo,
  });
  console.log("send_ok:", msg.sid, msg.status);
} catch (e) {
  console.log("send_fail:", e.code ?? "?", e.message);
  process.exit(2);
}
