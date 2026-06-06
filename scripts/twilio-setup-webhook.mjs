/**
 * Reads .env.local and registers Voice webhook on the Twilio number.
 * Usage: node scripts/twilio-setup-webhook.mjs
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

if (!sid || !token || !phone || !base) {
  console.error(
    "Missing env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WEBHOOK_BASE_URL in .env.local",
  );
  process.exit(1);
}

if (base.includes("localhost")) {
  console.error("TWILIO_WEBHOOK_BASE_URL must be a public https URL (tunnel).");
  process.exit(1);
}

const voiceUrl = `${base}/api/twilio/voice`;
const smsUrl = `${base}/api/twilio/sms`;
const client = twilio(sid, token);

const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: phone, limit: 1 });
if (!numbers[0]) {
  console.error(`Phone number not found in account: ${phone}`);
  process.exit(1);
}

await numbers[0].update({
  voiceUrl,
  voiceMethod: "POST",
  smsUrl,
  smsMethod: "POST",
});
console.log("OK Voice webhook:", voiceUrl);
console.log("OK SMS webhook:", smsUrl);
console.log("Number:", phone);
