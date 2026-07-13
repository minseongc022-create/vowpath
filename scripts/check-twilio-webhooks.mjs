/**
 * Prints Twilio Voice + SMS webhook URLs on your number vs .env.local
 * Usage: node scripts/check-twilio-webhooks.mjs
 */
import twilio from "twilio";
import { loadEnvLocal } from "./lib/load-env.mjs";

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
