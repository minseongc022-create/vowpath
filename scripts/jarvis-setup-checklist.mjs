/**
 * Jarvis / Effiroad production readiness checklist (local env inspection).
 * Usage: node scripts/jarvis-setup-checklist.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GROUPS = [
  {
    title: "Infrastructure (required prod)",
    keys: [
      ["AUTH_SECRET", true],
      ["CRON_SECRET", true],
      ["KV_REST_API_URL", true],
      ["KV_REST_API_TOKEN", true],
    ],
  },
  {
    title: "Jarvis AI detail + market",
    keys: [
      ["OPENAI_API_KEY", false],
      ["JARVIS_OPENAI_MODEL", false],
      ["DRAPH_API_URL", false],
      ["DRAPH_API_KEY", false],
      ["HOOKABLE_API_URL", false],
      ["HOOKABLE_API_KEY", false],
    ],
  },
  {
    title: "Toss Shopping FEP (live sync + publish)",
    keys: [
      ["TOSS_SHOPPING_ACCESS_KEY", false],
      ["TOSS_SHOPPING_SECRET_KEY", false],
      ["TOSS_SHOP_DEFAULT_CATEGORY_ID", false],
      ["TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID", false],
    ],
  },
  {
    title: "Wholesale sourcing",
    keys: [["DOMEGGOOK_API_KEY", false]],
  },
  {
    title: "Billing (Pro)",
    keys: [
      ["LEMON_SQUEEZY_API_KEY", false],
      ["LEMON_SQUEEZY_STORE_ID", false],
      ["LEMON_SQUEEZY_WEBHOOK_SECRET", false],
    ],
  },
  {
    title: "In vercel.json build.env (no secret needed)",
    keys: [
      ["JARVIS_AUTOPILOT_ENABLED", false],
      ["TOSS_SHOP_OWNER_EMAILS", false],
      ["TOSS_SHOP_PRO_ACTIVATION_CODE", false],
    ],
  },
  {
    title: "Autopilot tuning (optional)",
    keys: [
      ["JARVIS_AUTO_EXECUTE", false],
      ["JARVIS_AUTOPILOT_PICKS_PER_CYCLE", false],
    ],
  },
];

function inVercelJson(key) {
  try {
    const v = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    return Boolean(v.build?.env?.[key]);
  } catch {
    return false;
  }
}

function status(key, required) {
  const val = process.env[key]?.trim();
  if (val) return { icon: "✓", note: "set locally" };
  if (inVercelJson(key)) return { icon: "○", note: "in vercel.json build.env" };
  if (required) return { icon: "✗", note: "MISSING (required)" };
  return { icon: "·", note: "optional — not set" };
}

console.log("\n=== Jarvis / Effiroad setup checklist ===\n");

let missingRequired = 0;
for (const group of GROUPS) {
  console.log(`## ${group.title}`);
  for (const [key, required] of group.keys) {
    const s = status(key, required);
    if (s.icon === "✗") missingRequired++;
    console.log(`  ${s.icon} ${key} — ${s.note}`);
  }
  console.log("");
}

console.log("## External (not env vars)");
console.log("  · cron-job.org → GET /api/cron/toss-shop-sync every 60s + Bearer CRON_SECRET");
console.log("  · Vercel Production redeploy after env changes");
console.log("");

console.log("## Docs");
console.log("  · docs/JARVIS_CLAUDE_HANDOFF.md — full Claude handoff");
console.log("  · docs/TOSS_SHOP_SETUP.md — env reference");
console.log("  · CRON.md — 60s cron truth\n");

if (missingRequired > 0) {
  console.log(`⚠ ${missingRequired} required key(s) missing in local env (may exist on Vercel).\n`);
} else {
  console.log("Local required keys OK (or covered by vercel.json).\n");
}

process.exit(0);
