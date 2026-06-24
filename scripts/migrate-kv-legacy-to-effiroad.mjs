/**
 * Copy legacy vowpath:* and vowroad:* KV keys → effiroad:* (idempotent).
 * Usage: node scripts/migrate-kv-legacy-to-effiroad.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGACY_PREFIXES = ["vowpath:", "vowroad:"];

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    const val = m[2].replace(/^"|"$/g, "").trim();
    if (!val) continue;
    process.env[m[1]] = val;
  }
}

if (process.env.VERCEL !== "1") {
  loadEnvFile(".env.kv-migrate.tmp");
  loadEnvFile(".env.local");
  loadEnvFile(".env.production.local");
  loadEnvFile(".env.vercel.production");
}

function kvRestConfig() {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

const cfg = kvRestConfig();
if (!cfg) {
  console.error("Set KV_REST_API_URL and KV_REST_API_TOKEN (or Upstash REST equivalents)");
  process.exit(1);
}

async function kvCmd(command) {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`${command[0]} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function scan(pattern) {
  const keys = [];
  let cursor = 0;
  for (;;) {
    const result = await kvCmd(["SCAN", cursor, "MATCH", pattern, "COUNT", 200]);
    const next = result.result;
    cursor = Number(next[0]);
    keys.push(...next[1]);
    if (cursor === 0) break;
  }
  return keys;
}

async function migratePrefix(prefix) {
  const oldKeys = await scan(`${prefix}*`);
  console.log(`Found ${oldKeys.length} ${prefix}* keys`);
  if (oldKeys.length === 0) return { copied: 0, skipped: 0 };

  let copied = 0;
  let skipped = 0;
  for (const oldKey of oldKeys) {
    const newKey = oldKey.replace(new RegExp(`^${prefix}`), "effiroad:");
    const exists = await kvCmd(["EXISTS", newKey]);
    if (exists.result === 1) {
      skipped += 1;
      continue;
    }
    const val = await kvCmd(["GET", oldKey]);
    if (val.result == null) continue;
    const ttl = await kvCmd(["TTL", oldKey]);
    if (ttl.result > 0) {
      await kvCmd(["SET", newKey, val.result, "EX", ttl.result]);
    } else {
      await kvCmd(["SET", newKey, val.result]);
    }
    copied += 1;
  }
  return { copied, skipped };
}

async function main() {
  let totalCopied = 0;
  let totalSkipped = 0;
  for (const prefix of LEGACY_PREFIXES) {
    const { copied, skipped } = await migratePrefix(prefix);
    totalCopied += copied;
    totalSkipped += skipped;
  }

  if (totalCopied === 0 && totalSkipped === 0) {
    const newKeys = await scan("effiroad:*");
    console.log(`effiroad:* keys already present: ${newKeys.length}`);
    console.log("Nothing to migrate.");
    return;
  }

  console.log(`Migrated ${totalCopied} keys (${totalSkipped} already had effiroad: copy).`);
  console.log("Legacy vowpath:/vowroad: keys left for rollback; delete manually after verifying.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
