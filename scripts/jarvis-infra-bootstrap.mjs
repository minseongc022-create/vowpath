/**
 * One-shot Jarvis infra: Vercel env push + cron-job.org + optional redeploy + verify.
 *
 * Run locally with secrets, or via .github/workflows/jarvis-infra-bootstrap.yml
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInfraEnv, vercelToken } from "./lib/vercel-infra.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(label, script) {
  console.log(`\n=== ${label} ===\n`);
  const r = spawnSync("node", [join(root, script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`${script} failed with exit ${r.status}`);
  }
}

async function redeployIfHook() {
  const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
  if (!hook) {
    console.log("\n○ Skip redeploy — VERCEL_DEPLOY_HOOK not set\n");
    return;
  }
  console.log("\n=== Vercel redeploy hook ===\n");
  const res = await fetch(hook, { method: "POST" });
  if (!res.ok) throw new Error(`Deploy hook ${res.status}`);
  console.log("✓ Deploy hook triggered\n");
}

async function verifyCron() {
  const secret = process.env.CRON_SECRET?.trim();
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://effiroad.com").replace(/\/$/, "");
  if (!secret) {
    console.log("○ Skip cron verify — CRON_SECRET not in env\n");
    return;
  }
  console.log("\n=== Verify toss-shop-sync cron ===\n");
  const res = await fetch(`${base}/api/cron/toss-shop-sync`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (!res.ok) throw new Error("toss-shop-sync cron verify failed");
  console.log("✓ toss-shop-sync OK\n");
}

async function main() {
  if (vercelToken()) {
    console.log("\n=== Resolve Vercel project + CRON_SECRET ===\n");
    const resolved = await resolveInfraEnv();
    if (resolved.projectId) console.log(`  project: ${resolved.projectId}`);
    if (resolved.cronSecret) console.log("  CRON_SECRET: ready");
    console.log("");
  } else {
    console.log("\n○ Skip Vercel resolve — set VERCEL_TOKEN (CRON_SECRET then manual in GitHub)\n");
  }

  run("Jarvis setup checklist", "scripts/jarvis-setup-checklist.mjs");
  run("Vercel env push (toss-shop)", "scripts/toss-shop-production-env.mjs");
  run("cron-job.org external crons", "scripts/cron-job-org-setup.mjs");
  await redeployIfHook();
  await new Promise((r) => setTimeout(r, 15_000));
  run("Effiroad deploy verify", "scripts/effiroad-deploy-verify.mjs");
  await verifyCron();
  console.log("\n✓ Jarvis infra bootstrap complete\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
