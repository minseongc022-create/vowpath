/**
 * Effiroad launch readiness checker.
 * Runs: env checks + Twilio webhook verify.
 * Usage: node scripts/e2e-checklist.mjs
 * Prints GO / NO-GO verdict.
 */
import { loadEnvLocal } from "./lib/load-env.mjs";
import { execSync } from "child_process";

loadEnvLocal();

const results = [];

function check(name, pass, hint = "") {
  results.push({ name, pass, hint });
}

// ── Env checks (same as check-production-readiness.mjs) ──
check("AUTH_SECRET", Boolean(process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.length >= 32), "32+ char random string");
check("KV (Vercel)", Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN), "Attach Vercel KV in production");
check("NEXT_PUBLIC_BETA=false", process.env.NEXT_PUBLIC_BETA !== "true", "Set NEXT_PUBLIC_BETA=false for paid launch");
check("Lemon Squeezy API key", Boolean(process.env.LEMON_SQUEEZY_API_KEY?.trim()), "LEMON_SQUEEZY_API_KEY");
check("Lemon Squeezy store", Boolean(process.env.LEMON_SQUEEZY_STORE_ID?.trim()), "LEMON_SQUEEZY_STORE_ID");
check("Lemon Squeezy Flex base", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX), "LEMON_SQUEEZY_VARIANT_ID_FLEX");
check("Lemon Squeezy Flex usage", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX_USAGE), "LEMON_SQUEEZY_VARIANT_ID_FLEX_USAGE");
check("Lemon Squeezy Lite base", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_LITE), "LEMON_SQUEEZY_VARIANT_ID_LITE");
check("Lemon Squeezy Pro base", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_PRO), "LEMON_SQUEEZY_VARIANT_ID_PRO");
check("Lemon Squeezy Voice Starter", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER), "LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER");
check("Lemon Squeezy Voice Starter overage", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER_OVERAGE), "LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER_OVERAGE");
check("Lemon Squeezy Voice Pro", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO), "LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO");
check("Lemon Squeezy Voice Pro overage", Boolean(process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO_OVERAGE), "LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO_OVERAGE");
check("Twilio creds", Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN), "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN");
check("Twilio webhook base", Boolean(process.env.TWILIO_WEBHOOK_BASE_URL?.startsWith("https://")), "TWILIO_WEBHOOK_BASE_URL=https://effiroad.com");
check("OpenAI", Boolean(process.env.OPENAI_API_KEY?.startsWith("sk-")), "OPENAI_API_KEY");
check("CRON_SECRET", Boolean(process.env.CRON_SECRET?.trim()), "Protects /api/cron/* routes");

let cronConfigOk = false;
try {
  execSync("node scripts/check-cron-config.mjs", { stdio: "pipe" });
  cronConfigOk = true;
} catch {
  cronConfigOk = false;
}
check("Cron config (Hobby-safe)", cronConfigOk, "Run: npm run check:cron — see CRON.md");

// ── Twilio webhook live check ──
let twilioWebhookOk = false;
try {
  execSync("node scripts/verify-twilio-webhooks.mjs", { stdio: "pipe" });
  twilioWebhookOk = true;
} catch {
  twilioWebhookOk = false;
}
check("Twilio webhooks live", twilioWebhookOk, "Run: npm run twilio:register then npm run twilio:check");

// ── Print results ──
const failed = results.filter((r) => !r.pass);
const passed = results.filter((r) => r.pass);

console.log("\n╔══════════════════════════════════════╗");
console.log("║   Effiroad Launch Readiness Check   ║");
console.log("╚══════════════════════════════════════╝\n");

for (const r of results) {
  const icon = r.pass ? "✓" : "✗";
  const hint = r.pass ? "" : `  → ${r.hint}`;
  console.log(`${icon} ${r.name}${hint}`);
}

console.log(`\n${passed.length}/${results.length} checks passed`);

if (failed.length === 0) {
  console.log("\n🟢 VERDICT: GO — you're ready to start cold outreach.\n");
  process.exit(0);
} else {
  console.log(`\n🔴 VERDICT: NO-GO — fix ${failed.length} issue(s) above first.\n`);
  console.log("Next steps:");
  for (const f of failed) {
    console.log(`  • ${f.name}: ${f.hint}`);
  }
  console.log("");
  process.exit(1);
}
