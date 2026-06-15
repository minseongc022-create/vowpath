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
if (!sid || !token) {
  console.error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  process.exit(1);
}

const client = twilio(sid, token);
const acc = await client.api.accounts(sid).fetch();
console.log("Account name:", acc.friendlyName);
console.log("Status:", acc.status);
console.log("Type:", acc.type);

try {
  const bal = await client.api.accounts(sid).balance.fetch();
  console.log("Balance:", bal.balance, bal.currency);
} catch (e) {
  console.log("Balance: unavailable", e instanceof Error ? e.message : e);
}

const nums = await client.incomingPhoneNumbers.list({ limit: 5 });
console.log("\nPhone numbers in account:");
for (const n of nums) {
  console.log(" -", n.phoneNumber, "| voice:", n.voiceUrl);
}
