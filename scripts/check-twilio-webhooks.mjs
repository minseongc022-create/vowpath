/**
 * Prints Twilio Voice + SMS webhook URLs on your number vs .env.local
 * Usage: node scripts/check-twilio-webhooks.mjs
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

loadEnvLocal();

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();
const phone = process.env.TWILIO_PHONE_NUMBER?.trim();
const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "");

if (!sid || !token || !phone) {
  console.log("MISSING_ENV: TWILIO_ACCOUNT_SID, AUTH_TOKEN, or PHONE_NUMBER");
  process.exit(1);
}

const client = twilio(sid, token);
const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: phone, limit: 1 });
const n = numbers[0];
if (!n) {
  console.log("PHONE_NOT_FOUND:", phone);
  process.exit(1);
}

const expectedVoice = base ? `${base}/api/twilio/voice` : "(set TWILIO_WEBHOOK_BASE_URL)";
const expectedSms = base ? `${base}/api/twilio/sms` : "(set TWILIO_WEBHOOK_BASE_URL)";

console.log("--- Twilio number:", phone);
console.log("--- .env TWILIO_WEBHOOK_BASE_URL:", base || "(none)");
console.log("");
console.log("VOICE on Twilio:", n.voiceUrl || "(not set)");
console.log("VOICE expected: ", expectedVoice);
console.log("VOICE OK:", n.voiceUrl === expectedVoice ? "yes" : "NO");
console.log("");
console.log("SMS on Twilio:  ", n.smsUrl || "(not set)");
console.log("SMS expected:   ", expectedSms);
console.log("SMS OK:", n.smsUrl === expectedSms ? "yes" : "NO");
