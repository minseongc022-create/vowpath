/**
 * One-time: copy vowroad:* KV keys → vowroad:* (production migration after prefix rename).
 * Usage: node scripts/migrate-kv-vowpath-to-vowroad.mjs
 * Requires KV_REST_API_URL + KV_REST_API_TOKEN in env.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production.local");
loadEnvFile(".env.vercel.production");

const url = process.env.KV_REST_API_URL?.trim();
const token = process.env.KV_REST_API_TOKEN?.trim();
if (!url || !token) {
  console.error("Set KV_REST_API_URL and KV_REST_API_TOKEN");
  process.exit(1);
}

async function kvCmd(command) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

async function main() {
  const oldKeys = await scan("vowroad:*");
  if (oldKeys.length === 0) {
    console.log("No vowroad:* keys found — nothing to migrate.");
    return;
  }
  let copied = 0;
  let skipped = 0;
  for (const oldKey of oldKeys) {
    const newKey = oldKey.replace(/^vowroad:/, "vowroad:");
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
  console.log(`Migrated ${copied} keys (${skipped} already had vowroad: copy).`);
  console.log("Old vowroad:* keys left in place for rollback; delete manually after verifying.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
