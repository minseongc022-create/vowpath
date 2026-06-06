/**
 * One-shot: Voice + SMS webhooks on Twilio number + bind number to tenant.
 * Usage: node scripts/register-twilio-all.mjs
 */
import { readFileSync, writeFileSync } from "fs";
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
  return path;
}

loadEnvLocal();

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();
const phone = process.env.TWILIO_PHONE_NUMBER?.trim();
const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "");
const userId = process.env.TWILIO_DEFAULT_USER_ID?.trim();

if (!sid || !token || !phone || !base) {
  console.error("MISSING: TWILIO_ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER, WEBHOOK_BASE_URL");
  process.exit(1);
}

if (base.includes("localhost") || base.includes("127.0.0.1")) {
  console.error("WEBHOOK_BASE must be public https (run npm run tunnel first).");
  process.exit(1);
}

if (!userId) {
  console.error("MISSING: TWILIO_DEFAULT_USER_ID");
  process.exit(1);
}

const voiceUrl = `${base}/api/twilio/voice`;
const smsUrl = `${base}/api/twilio/sms`;
const client = twilio(sid, token);

const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: phone, limit: 1 });
if (!numbers[0]) {
  console.error("PHONE_NOT_IN_ACCOUNT:", phone);
  process.exit(1);
}

await numbers[0].update({
  voiceUrl,
  voiceMethod: "POST",
  smsUrl,
  smsMethod: "POST",
});

console.log("OK webhooks registered");
console.log("  Voice:", voiceUrl);
console.log("  SMS:  ", smsUrl);

// Bind Twilio number → tenant (same as configure-webhook API)
const { kv } = await import("@vercel/kv");
const useKv =
  Boolean(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());

function normalizeE164(p) {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return p.startsWith("+") ? p : `+${digits}`;
}

const e164 = normalizeE164(phone);
if (useKv) {
  await kv.set(`vowpath:twilio-phone:${e164}`, userId);
  console.log("OK phone bound to tenant (KV):", e164, "→", userId);
} else {
  const mapPath = join(process.cwd(), "data", "twilio-phone-map.json");
  let store = { mappings: {} };
  try {
    store = JSON.parse(readFileSync(mapPath, "utf8"));
  } catch {
    /* new */
  }
  store.mappings[e164] = userId;
  const { mkdir } = await import("fs/promises");
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(mapPath, JSON.stringify(store, null, 2), "utf8");
  console.log("OK phone bound to tenant (file):", e164, "→", userId);
}

console.log("\nDone. Keep tunnel running if using loca.lt / localtunnel.");
