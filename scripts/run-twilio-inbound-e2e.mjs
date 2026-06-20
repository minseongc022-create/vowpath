/**
 * Twilio inbound webhook smoke (dev) — voice start, SMS link path, speech intake.
 * Usage: node scripts/run-twilio-inbound-e2e.mjs [port]
 */
import { ensureDevUser, apiFetch } from "./lib/e2e-session.mjs";
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const port = Number(process.argv[2] || process.env.PORT || 3000);
const base = `http://localhost:${port}`;
const user = ensureDevUser();
const to =
  process.env.TWILIO_PHONE_NUMBER?.trim() ||
  process.env.TWILIO_DEFAULT_TO?.trim() ||
  "+12255291680";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const steps = ["voice", "channel_sms", "channel_phone", "intake_speech"];

const res = await apiFetch(base, "/api/dev/twilio-inbound-smoke", user, {
  method: "POST",
  body: JSON.stringify({ steps, to, from: user.phone ?? "+15125550100" }),
});

if (!res.res.ok) fail(`twilio-inbound-smoke: ${JSON.stringify(res.json)}`);

for (const s of res.json.results ?? []) {
  if (s.ok) {
    console.log(`✓ ${s.step}${s.detail ? `: ${s.detail}` : ""}`);
  } else {
    fail(`${s.step}: ${s.error ?? "failed"}`);
  }
}

console.log("\n✅ Twilio inbound smoke complete");
