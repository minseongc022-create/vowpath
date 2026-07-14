/**
 * Validates vercel.json cron schedules against config/cron.schedule.json.
 * Prevents re-adding sub-daily Vercel crons that block Hobby-plan deploys.
 *
 * Usage: node scripts/check-cron-config.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

/** Vercel Hobby: at most once per day — minute and hour must be fixed numbers. */
function isHobbySafeSchedule(schedule) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour] = parts;
  const fixed = (field) => /^\d+$/.test(field);
  return fixed(min) && fixed(hour);
}

function main() {
  const vercel = loadJson("vercel.json");
  const manifest = loadJson("config/cron.schedule.json");
  let failed = 0;

  console.log("\n=== Cron config check ===\n");

  const expected = new Map(
    manifest.vercelCrons.map((c) => [c.path, c.schedule]),
  );

  for (const cron of vercel.crons ?? []) {
    const { path, schedule } = cron;

    if (!isHobbySafeSchedule(schedule)) {
      console.log(`✗ ${path} — schedule "${schedule}" is NOT Hobby-safe (sub-daily deploy blocker)`);
      failed++;
      continue;
    }

    const want = expected.get(path);
    if (!want) {
      console.log(`✗ ${path} — in vercel.json but missing from config/cron.schedule.json`);
      failed++;
      continue;
    }

    if (want !== schedule) {
      console.log(`✗ ${path} — vercel.json has "${schedule}", manifest expects "${want}"`);
      failed++;
      continue;
    }

    console.log(`✓ ${path} — ${schedule} (daily, Hobby-safe)`);
  }

  for (const [path] of expected) {
    if (!(vercel.crons ?? []).some((c) => c.path === path)) {
      console.log(`✗ ${path} — in manifest but missing from vercel.json`);
      failed++;
    }
  }

  for (const cron of vercel.crons ?? []) {
    if (cron.schedule === "* * * * *" || cron.path.includes("tech-offer-escalation")) {
      console.log(`✗ ${cron.path} — must not use per-minute Vercel cron on Hobby`);
      failed++;
    }
  }

  console.log("\n--- External production cron (required) ---\n");
  for (const ext of manifest.externalCrons) {
    console.log(
      `  ${ext.provider}: ${ext.path} every ${ext.intervalSeconds}s (${ext.authHeader})`,
    );
  }
  console.log("\n  See CRON.md — do not infer dispatch timing from vercel.json alone.\n");

  if (failed > 0) {
    console.log(`${failed} cron check(s) failed.\n`);
    process.exit(1);
  }

  console.log("All cron checks passed.\n");
}

main();
