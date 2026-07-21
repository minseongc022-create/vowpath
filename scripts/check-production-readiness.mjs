/**
 * Non-destructive production env checklist (loads .env.local if present).
 * Usage: node scripts/check-production-readiness.mjs
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const checks = [];

function ok(name, pass, hint) {
  checks.push({ name, pass, hint });
}

ok(
  "AUTH_SECRET",
  Boolean(process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.length >= 32),
  "32+ char random string",
);
ok(
  "KV (Vercel)",
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  "Attach Vercel KV in production",
);
ok(
  "NEXT_PUBLIC_BETA",
  process.env.NEXT_PUBLIC_BETA !== "true",
  "Set NEXT_PUBLIC_BETA=false for paid launch",
);
ok(
  "Paddle API key",
  Boolean(process.env.PADDLE_API_KEY?.startsWith("pdl_")),
  "PADDLE_API_KEY",
);
ok(
  "Paddle unlimited price",
  Boolean(process.env.PADDLE_PRICE_ID_UNLIMITED),
  "PADDLE_PRICE_ID_UNLIMITED",
);
ok(
  "Paddle flex base",
  Boolean(process.env.PADDLE_PRICE_ID_FLEX),
  "PADDLE_PRICE_ID_FLEX for flex plan",
);
ok(
  "Paddle client token",
  Boolean(
    process.env.PADDLE_CLIENT_TOKEN?.trim() ||
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim(),
  ),
  "PADDLE_CLIENT_TOKEN or NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
);
ok(
  "Paddle flex usage",
  Boolean(process.env.PADDLE_PRICE_ID_FLEX_USAGE),
  "PADDLE_PRICE_ID_FLEX_USAGE — per-dispatch fee for Flex",
);
ok(
  "Paddle lite base",
  Boolean(process.env.PADDLE_PRICE_ID_LITE),
  "PADDLE_PRICE_ID_LITE for Lite plan",
);
ok(
  "Paddle lite usage",
  Boolean(process.env.PADDLE_PRICE_ID_LITE_USAGE),
  "PADDLE_PRICE_ID_LITE_USAGE — per-dispatch fee for Lite",
);
ok(
  "Paddle Pro base",
  Boolean(process.env.PADDLE_PRICE_ID_PRO || process.env.PADDLE_PRICE_ID_UNLIMITED),
  "PADDLE_PRICE_ID_PRO (or legacy UNLIMITED)",
);
ok(
  "Paddle Scale base",
  Boolean(process.env.PADDLE_PRICE_ID_SCALE),
  "PADDLE_PRICE_ID_SCALE",
);
ok(
  "Paddle Voice Starter",
  Boolean(process.env.PADDLE_PRICE_ID_VOICE_STARTER),
  "PADDLE_PRICE_ID_VOICE_STARTER — per-minute track",
);
ok(
  "Paddle Voice Starter overage",
  Boolean(process.env.PADDLE_PRICE_ID_VOICE_STARTER_OVERAGE),
  "PADDLE_PRICE_ID_VOICE_STARTER_OVERAGE — $/min beyond included",
);
ok(
  "Paddle Voice Pro",
  Boolean(process.env.PADDLE_PRICE_ID_VOICE_PRO),
  "PADDLE_PRICE_ID_VOICE_PRO",
);
ok(
  "Paddle Voice Pro overage",
  Boolean(process.env.PADDLE_PRICE_ID_VOICE_PRO_OVERAGE),
  "PADDLE_PRICE_ID_VOICE_PRO_OVERAGE",
);
ok(
  "Twilio",
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN",
);
ok(
  "Twilio webhook base",
  Boolean(process.env.TWILIO_WEBHOOK_BASE_URL?.startsWith("https://")),
  "TWILIO_WEBHOOK_BASE_URL=https://your-domain.com",
);
ok(
  "OpenAI",
  Boolean(process.env.OPENAI_API_KEY?.startsWith("sk-")),
  "OPENAI_API_KEY for intake extraction",
);
ok(
  "CRON_SECRET",
  Boolean(process.env.CRON_SECRET?.trim()),
  "Protects /api/cron/* routes",
);

let failed = 0;
console.log("\n=== Production readiness ===\n");
for (const c of checks) {
  const mark = c.pass ? "✓" : "✗";
  console.log(`${mark} ${c.name}${c.pass ? "" : ` — ${c.hint}`}`);
  if (!c.pass) failed++;
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exit(1);
