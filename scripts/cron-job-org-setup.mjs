/**
 * Idempotent cron-job.org setup from config/cron.schedule.json externalCrons.
 *
 *   export CRONJOB_ORG_API_KEY=...   # cron-job.org → Settings → API
 *   export CRON_SECRET=...           # same as Vercel /api/cron/*
 *   export NEXT_PUBLIC_APP_URL=https://effiroad.com
 *   node scripts/cron-job-org-setup.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveInfraEnv, vercelToken } from "./lib/vercel-infra.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.cron-job.org";
const apiKey = process.env.CRONJOB_ORG_API_KEY?.trim();
let cronSecret = process.env.CRON_SECRET?.trim();
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://effiroad.com").replace(/\/$/, "");

function loadExternalCrons() {
  const raw = JSON.parse(readFileSync(join(root, "config/cron.schedule.json"), "utf8"));
  return raw.externalCrons ?? [];
}

async function cronApi(path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`cron-job.org ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function jobPayload(entry) {
  const url = `${baseUrl}${entry.path}`;
  const title = `Effiroad ${entry.path.replace("/api/cron/", "")} (60s)`;
  return {
    job: {
      url,
      title,
      enabled: true,
      saveResponses: false,
      requestMethod: 0,
      requestTimeout: 120,
      schedule: {
        timezone: "UTC",
        expiresAt: 0,
        hours: [-1],
        mdays: [-1],
        minutes: [-1],
        months: [-1],
        wdays: [-1],
      },
      extendedData: {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      },
    },
  };
}

async function main() {
  if (!apiKey) {
    console.log("Skip cron-job.org — set CRONJOB_ORG_API_KEY (Console → Settings → API key)");
    process.exit(0);
  }
  if (!cronSecret && vercelToken()) {
    await resolveInfraEnv();
    cronSecret = process.env.CRON_SECRET?.trim();
  }
  if (!cronSecret) {
    console.log("Skip cron-job.org — set CRON_SECRET or VERCEL_TOKEN (reads from Vercel Production)");
    process.exit(1);
  }

  const entries = loadExternalCrons();
  const { jobs = [] } = await cronApi("/jobs", "GET");
  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const url = `${baseUrl}${entry.path}`;
    const existing = jobs.find((j) => j.url === url);
    const payload = jobPayload(entry);

    if (existing) {
      await cronApi(`/jobs/${existing.jobId}`, "PATCH", payload);
      console.log(`↻ updated job ${existing.jobId} → ${url}`);
      updated++;
    } else {
      const { jobId } = await cronApi("/jobs", "PUT", payload);
      console.log(`✓ created job ${jobId} → ${url}`);
      created++;
    }
  }

  console.log(`\nDone: ${created} created, ${updated} updated (${entries.length} external crons)\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
