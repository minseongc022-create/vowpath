/**
 * Runs vowpath:* → vowroad:* KV copy once per Vercel production deploy (idempotent).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production") {
  console.log("[postbuild] skip KV migration (not Vercel production)");
  process.exit(0);
}

const script = path.join(root, "scripts", "migrate-kv-vowpath-to-vowroad.mjs");
const result = spawnSync(process.execPath, [script], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});

process.exit(result.status === 0 ? 0 : 1);
