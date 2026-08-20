#!/usr/bin/env node
/**
 * Run one collection cycle from the CLI.
 *
 *   npm run pricepulse:collect -- --dry-run          # parse, store nothing
 *   npm run pricepulse:collect -- --only kw-lip-balm
 *   npm run pricepulse:collect                       # full run, writes to the store
 *
 * Without PRICEPULSE_SUPABASE_URL it writes NDJSON to pricepulse/data/.
 */
import { runCollection } from "../pricepulse/lib/collect/run.ts";
import { getRuntimeConfig } from "../pricepulse/lib/config.ts";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1]?.split(",") : undefined;

const config = getRuntimeConfig();
console.log(
  `pricepulse collect — ua="${config.userAgent}" gap=${config.minGapMs}ms robots=${config.respectRobots} ` +
    `store=${config.supabaseUrl ? "supabase" : "file"}${dryRun ? " (dry run)" : ""}`,
);

let run;
try {
  run = await runCollection({ dryRun, only });
} catch (error) {
  // Config/profile problems are operator errors, not crashes — say what to do.
  console.error(`\n✗ ${error.message}\n`);
  process.exit(2);
}

console.log(`\nrun ${run.runId}  ${run.startedAt} → ${run.finishedAt}`);
for (const target of run.targets) {
  const status = target.ok ? "ok  " : "FAIL";
  console.log(
    `  ${status} ${target.targetId.padEnd(22)} items=${String(target.itemCount).padStart(3)} ` +
      `pages=${target.pagesFetched} ${target.durationMs}ms${target.error ? `  — ${target.error}` : ""}`,
  );
}
console.log(
  `\ntotals: ${run.totals.okTargets}/${run.totals.targets} targets ok, ` +
    `${run.totals.items} items, ${run.totals.stored} stored`,
);
if (run.alerts.length) {
  console.log("alerts:");
  for (const alert of run.alerts) console.log(`  ! ${alert}`);
}

process.exit(run.ok ? 0 : 1);
