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
  "PADDLE_PRICE_ID_FLEX_USAGE — per-booking fee for flex plan",
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
