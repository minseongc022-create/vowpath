/**
 * Start Verified Caller ID flow via API (when console button won't open).
 * Usage: node scripts/verify-caller-id.mjs +821055969438
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
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("010")) return `+82${digits.slice(1)}`;
  return null;
}

loadEnvLocal();

const phoneArg = process.argv[2]?.trim();
const phone = normalizeE164(phoneArg ?? "");
const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();

if (!sid || !token) {
  console.error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env.local");
  process.exit(1);
}

if (!phone) {
  console.error("Usage: node scripts/verify-caller-id.mjs +821055969438");
  process.exit(1);
}

const client = twilio(sid, token);

try {
  const req = await client.validationRequests.create({
    friendlyName: "Vowpath owner",
    phoneNumber: phone,
  });

  console.log("OK — Twilio is calling or texting:", phone);
  console.log("");
  console.log("When prompted, enter this 6-digit code:");
  console.log("  >>>", req.validationCode, "<<<");
  console.log("");
  console.log("If you get a phone call: answer and type the digits on keypad.");
  console.log("After success, run: npm run twilio:verified");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("already verified")) {
    console.log("Already verified:", phone);
    process.exit(0);
  }
  console.error("FAIL:", msg);
  process.exit(1);
}
