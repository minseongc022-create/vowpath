/**
 * Simulate "press 1 during a call" on production Twilio webhook.
 * Creates link-intake session in prod KV and sends the real SMS.
 *
 * Usage:
 *   node scripts/send-link-intake-sms.mjs +821055969438
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

function normalizeE164(input) {
  const trimmed = String(input ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("010")) return `+82${digits.slice(1)}`;
  return null;
}

function webhookBaseUrl() {
  const base =
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://effiroad.com";
  return base.replace(/\/$/, "");
}

loadEnvLocal();

const customerPhone = normalizeE164(
  process.argv[2]?.trim() || process.env.SMS_PROBE_TO || "+821055969438",
);
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const twilioNumber = normalizeE164(process.env.TWILIO_PHONE_NUMBER?.trim() ?? "");

if (!customerPhone) {
  console.error("Invalid customer phone. Example: +821055969438");
  process.exit(1);
}
if (!authToken || !twilioNumber) {
  console.error("Missing TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER in .env.local");
  process.exit(1);
}

const callSid = `CAdev${Date.now()}`;
const base = webhookBaseUrl();
const path = "/api/twilio/channel";
const webhookUrl = `${base}${path}`;

const params = {
  CallSid: callSid,
  Digits: "1",
  From: customerPhone,
  To: twilioNumber,
};
const body = new URLSearchParams(params).toString();
const signature = twilio.getExpectedTwilioSignature(authToken, webhookUrl, params);

console.log("POST", webhookUrl);
console.log("from:", customerPhone, "to:", twilioNumber);

const res = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Twilio-Signature": signature,
  },
  body,
});

const text = await res.text();
console.log("status:", res.status);
console.log("twiml:", text.slice(0, 280));

if (!res.ok) {
  console.error("Webhook failed — check TWILIO_WEBHOOK_BASE_URL and phone tenant bind.");
  process.exit(1);
}

if (text.includes("couldn't send a text") || text.includes("not fully set up")) {
  console.error("Twilio channel rejected link SMS. See twiml above.");
  process.exit(2);
}

console.log("");
console.log("OK — production link-intake SMS triggered.");
console.log("Open the latest SMS on your phone; the link should work on", base);
