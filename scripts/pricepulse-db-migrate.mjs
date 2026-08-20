#!/usr/bin/env node
/**
 * Apply pricepulse/sql/001_init.sql to a Postgres database via psql.
 *
 *   PRICEPULSE_DATABASE_URL="postgres://...supabase connection string..." \
 *     npm run pricepulse:db:migrate
 *
 * This is the only step of Supabase setup that needs a local tool (psql).
 * If you'd rather not install it, paste pricepulse/sql/001_init.sql into the
 * Supabase SQL editor instead — same effect, zero local dependencies.
 *
 * Where to get the connection string: Supabase project → Settings →
 * Database → Connection string → URI (use the "Session pooler" or direct
 * connection; either works for a one-off migration).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SQL_FILE = path.join(ROOT, "pricepulse", "sql", "001_init.sql");

const url =
  process.env.PRICEPULSE_DATABASE_URL?.trim() ||
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(
    "PRICEPULSE_DATABASE_URL is not set.\n\n" +
      "Get it from Supabase: project → Settings → Database → Connection string → URI.\n" +
      "Then run:\n  PRICEPULSE_DATABASE_URL=\"postgres://...\" npm run pricepulse:db:migrate\n",
  );
  process.exit(1);
}

const which = spawnSync("psql", ["--version"], { encoding: "utf8" });
if (which.status !== 0) {
  console.error(
    "psql is not installed or not on PATH.\n\n" +
      "Install it (macOS: `brew install libpq && brew link --force libpq`, " +
      "Ubuntu/Debian: `sudo apt install postgresql-client`), or skip this script " +
      "entirely and paste pricepulse/sql/001_init.sql into the Supabase SQL editor instead.\n",
  );
  process.exit(1);
}

let sql;
try {
  sql = readFileSync(SQL_FILE, "utf8");
} catch (error) {
  console.error(`Cannot read ${SQL_FILE}: ${error.message}`);
  process.exit(1);
}

console.log(`Applying ${path.relative(ROOT, SQL_FILE)} (${sql.split("\n").length} lines)...`);

const result = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-f", SQL_FILE], {
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error("\n✗ Migration failed — see psql output above.");
  process.exit(result.status ?? 1);
}

console.log(
  "\n✓ Migration applied. Tables/views created: pricepulse_runs, pricepulse_products, " +
    "pricepulse_observations, pricepulse_health, pricepulse_rank_moves, pricepulse_target_daily_low.\n" +
    "Next: set PRICEPULSE_SUPABASE_URL / PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY and run " +
    "`npm run pricepulse:collect` (once the profile is verified).",
);
