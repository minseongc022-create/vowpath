/**
 * Regenerate favicons from public/logo-source.png (or latest Cursor asset).
 * Prefer: node scripts/generate-brand-assets.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "generate-brand-assets.mjs");
const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
process.exit(result.status ?? 1);
