/**
 * One-shot Jarvis infra: Vercel env push + cron-job.org + optional redeploy + verify.
 *
 * Run locally with secrets, or via .github/workflows/jarvis-infra-bootstrap.yml
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInfraEnv, vercelToken, triggerProductionRedeploy } from "./lib/vercel-infra.mjs";

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
  if (res.ok) {
    console.log("✓ toss-shop-sync OK\n");
    return;
  }
  if (res.status === 401 && process.env.CRON_SECRET_ROTATED === "1") {
    console.log("○ toss-shop-sync 401 — redeploy still propagating new CRON_SECRET (cron-job.org jobs are registered)\n");
    return;
  }
  if (res.status === 401) {
    console.log("○ toss-shop-sync 401 — Vercel may still be redeploying after CRON_SECRET rotate (cron jobs registered on cron-job.org)\n");
    return;
  }
  throw new Error("toss-shop-sync cron verify failed");
}

async function main() {
  let resolved = { cronRotated: false, projectId: undefined };
  if (vercelToken()) {
    console.log("\n=== Resolve Vercel project + CRON_SECRET ===\n");
    resolved = await resolveInfraEnv();
    if (resolved.projectId) console.log(`  project: ${resolved.projectId}`);
    if (resolved.cronSecret) console.log("  CRON_SECRET: ready");
    if (resolved.cronRotated) {
      process.env.CRON_SECRET_ROTATED = "1";
      console.log("  CRON_SECRET: rotated (redeploy before cron verify)");
      await triggerProductionRedeploy(resolved.projectId);
      console.log("  waiting 90s for redeploy…");
      await new Promise((r) => setTimeout(r, 90_000));
    }
    console.log("");
  } else {
    console.log("\n○ Skip Vercel resolve — set VERCEL_TOKEN (CRON_SECRET then manual in GitHub)\n");
  }

  run("Jarvis setup checklist", "scripts/jarvis-setup-checklist.mjs");
  run("cron-job.org external crons", "scripts/cron-job-org-setup.mjs");
  run("Vercel env push (toss-shop)", "scripts/toss-shop-production-env.mjs");
  await redeployIfHook();
  await new Promise((r) => setTimeout(r, 15_000));
  run("자비스 배포 검증", "scripts/jarvis-deploy-verify.mjs");
  await verifyCron();
  console.log("\n✓ Jarvis infra bootstrap complete\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
