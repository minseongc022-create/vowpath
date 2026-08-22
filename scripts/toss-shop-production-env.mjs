/**
 * Push toss-shop env vars to Vercel Production (when VERCEL_TOKEN is set).
 *
 *   export VERCEL_TOKEN=...       # vercel.com/account/tokens
 *   export VERCEL_PROJECT_ID=...  # Project → Settings → General
 *   export VERCEL_TEAM_ID=...     # optional (team projects)
 *   node scripts/toss-shop-production-env.mjs
 *
 * Non-secrets are already in vercel.json build.env. This script adds runtime
 * secrets you keep in GitHub / local env (LS keys, Toss API, etc.).
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const token = process.env.VERCEL_TOKEN?.trim();
const projectId = process.env.VERCEL_PROJECT_ID?.trim();
const teamId = process.env.VERCEL_TEAM_ID?.trim();

/** Keys already baked into vercel.json — skip unless override in .env.local */
const IN_VERCEL_JSON = new Set([
  "NEXT_PUBLIC_SELLER_PULSE_AT_ROOT",
  "NEXT_PUBLIC_APP_URL",
  "TOSS_SHOP_OWNER_EMAILS",
  "TOSS_SHOP_KRW_PER_USD",
  "TOSS_SHOP_PRO_ACTIVATION_CODE",
  "JARVIS_AUTOPILOT_ENABLED",
]);

/** Optional runtime secrets (push when present in env) */
const OPTIONAL_KEYS = [
  "AUTH_SECRET",
  "CRON_SECRET",
  "OPENAI_API_KEY",
  "JARVIS_OPENAI_MODEL",
  "DRAPH_API_URL",
  "DRAPH_API_KEY",
  "HOOKABLE_API_URL",
  "HOOKABLE_API_KEY",
  "SELLERBISEO_API_URL",
  "SELLERBISEO_API_KEY",
  "DOMEGGOOK_API_KEY",
  "JARVIS_AUTO_EXECUTE",
  "JARVIS_MATCHCUT_ENABLED",
  "TOSS_SHOP_DEFAULT_CATEGORY_ID",
  "TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID",
  "TOSS_SHOP_MONTHLY_GOAL_KRW",
  "LEMON_SQUEEZY_VARIANT_ID_TOSS_SHOP_PRO",
  "TOSS_SHOPPING_ACCESS_KEY",
  "TOSS_SHOPPING_SECRET_KEY",
  "TOSS_SHOPPING_SANDBOX",
  "TOSS_SHOPPING_PARTNER_NAME",
  "TOSS_SHOP_LEMON_SQUEEZY_WEBHOOK_SECRET",
];

async function vercelApi(path, method, body) {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(`https://api.vercel.com${path}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function upsertEnv(key, value, target = ["production"]) {
  await vercelApi(`/v10/projects/${projectId}/env`, "POST", {
    key,
    value,
    type: "encrypted",
    target,
  });
  console.log(`✓ ${key}`);
}

async function main() {
  if (!token || !projectId) {
    console.log("Set VERCEL_TOKEN + VERCEL_PROJECT_ID to push runtime secrets.");
    console.log("Non-secrets are in vercel.json (deployed on next push to main).");
    console.log("\nAlready in vercel.json:");
    for (const k of IN_VERCEL_JSON) console.log(`  - ${k}`);
    console.log("\nOptional (add to Vercel manually or via this script with .env.local):");
    for (const k of OPTIONAL_KEYS) console.log(`  - ${k}`);
    console.log("\nUses existing Vercel LS keys when TOSS_SHOP variant unset:");
    console.log("  - LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID");
    console.log("  - LEMON_SQUEEZY_VARIANT_ID_GIU (fallback checkout variant)");
    console.log("  - LEMON_SQUEEZY_WEBHOOK_SECRET");
    process.exit(0);
  }

  for (const key of OPTIONAL_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    await upsertEnv(key, value);
  }

  console.log("Done. Redeploy production for env changes to apply.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
