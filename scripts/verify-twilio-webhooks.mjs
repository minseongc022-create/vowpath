/**
 * Verifies Twilio webhook URLs are set to effiroad.com (or TWILIO_WEBHOOK_BASE_URL).
 * Usage: node scripts/verify-twilio-webhooks.mjs
 * Returns exit 0 if both voice + SMS are correct; exit 1 otherwise.
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "");

if (!sid || !authToken) {
  console.error("MISSING: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  process.exit(1);
}
if (!base) {
  console.error("MISSING: TWILIO_WEBHOOK_BASE_URL (e.g. https://effiroad.com)");
  process.exit(1);
}

const expectedVoice = `${base}/api/twilio/voice`;
const expectedSms = `${base}/api/twilio/sms`;

// Fetch all active numbers via Twilio REST API (no SDK dependency)
const auth = Buffer.from(`${sid}:${authToken}`).toString("base64");
const res = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PageSize=50`,
  { headers: { Authorization: `Basic ${auth}` } },
);

if (!res.ok) {
  const text = await res.text();
  console.error(`Twilio API error ${res.status}: ${text}`);
  process.exit(1);
}

const data = await res.json();
const numbers = data.incoming_phone_numbers ?? [];

if (numbers.length === 0) {
  console.error("No Twilio numbers found on this account.");
  process.exit(1);
}

console.log(`\n=== Twilio Webhook Verification ===`);
console.log(`Expected base: ${base}`);
console.log(`Checking ${numbers.length} number(s)...\n`);

let allOk = true;

for (const n of numbers) {
  const voiceOk = n.voice_url === expectedVoice;
  const smsOk = n.sms_url === expectedSms;
  const ok = voiceOk && smsOk;
  if (!ok) allOk = false;

  console.log(`Number: ${n.phone_number}`);
  console.log(`  Voice: ${n.voice_url || "(not set)"}`);
  console.log(`  Voice OK: ${voiceOk ? "✓" : `✗  expected: ${expectedVoice}`}`);
  console.log(`  SMS:   ${n.sms_url || "(not set)"}`);
  console.log(`  SMS OK:   ${smsOk ? "✓" : `✗  expected: ${expectedSms}`}`);
  console.log("");
}

if (allOk) {
  console.log("✓ All webhooks are correctly set.\n");
  process.exit(0);
} else {
  console.log("✗ Some webhooks are wrong. Run: npm run twilio:register\n");
  process.exit(1);
}
