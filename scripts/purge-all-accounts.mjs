/**
 * Delete ALL Vowpath accounts and tenant data (KV + local data/*.json).
 * Usage: node scripts/purge-all-accounts.mjs --confirm
 */
import { readFileSync, readdirSync, unlinkSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function loadEnvFile(filename) {
  const path = join(process.cwd(), filename);
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    return true;
  } catch {
    return false;
  }
}

function loadEnv() {
  loadEnvFile(".env.production.local");
  loadEnvFile(".env.local");
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

async function redisCmd(cfg, command) {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis REST ${res.status}: ${text}`);
  }
  return res.json();
}

async function scanAllKeys(cfg, pattern = "vowroad:*") {
  const keys = new Set();
  let cursor = "0";
  do {
    const result = await redisCmd(cfg, ["SCAN", cursor, "MATCH", pattern, "COUNT", 200]);
    cursor = String(result.result[0]);
    const batch = result.result[1] ?? [];
    for (const k of batch) keys.add(k);
  } while (cursor !== "0");
  return [...keys];
}

async function deleteKeys(cfg, keys) {
  if (keys.length === 0) return 0;
  const chunkSize = 50;
  let deleted = 0;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    await redisCmd(cfg, ["DEL", ...chunk]);
    deleted += chunk.length;
  }
  return deleted;
}

function purgeLocalData() {
  const dataDir = join(process.cwd(), "data");
  let removed = 0;
  try {
    mkdirSync(dataDir, { recursive: true });
    for (const name of readdirSync(dataDir)) {
      if (!name.endsWith(".json")) continue;
      unlinkSync(join(dataDir, name));
      removed += 1;
    }
  } catch {
    /* no data dir */
  }
  return removed;
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  if (!confirm) {
    console.error("Refusing to run without --confirm");
    console.error("Usage: node scripts/purge-all-accounts.mjs --confirm");
    process.exit(1);
  }

  loadEnv();
  const cfg = kvRestConfig();

  let usersBefore = [];
  if (cfg) {
    try {
      const usersRaw = await redisCmd(cfg, ["GET", "vowroad:users"]);
      const parsed = usersRaw.result ? JSON.parse(usersRaw.result) : null;
      usersBefore = parsed?.users ?? [];
    } catch {
      /* ignore */
    }
  }

  console.log("=== Vowpath account purge ===");
  if (usersBefore.length > 0) {
    console.log(`Accounts to remove (${usersBefore.length}):`);
    for (const u of usersBefore) {
      console.log(`  - ${u.email} (${u.id}) ${u.shopName ?? ""}`);
    }
  } else {
    console.log("No accounts found in vowroad:users (or KV unreachable).");
  }

  let kvDeleted = 0;
  if (cfg) {
    const keys = await scanAllKeys(cfg);
    console.log(`KV keys matched vowroad:* : ${keys.length}`);
    kvDeleted = await deleteKeys(cfg, keys);
    console.log(`KV keys deleted: ${kvDeleted}`);
  } else {
    console.warn("KV_REST_API_URL / KV_REST_API_TOKEN not set — skipping remote KV.");
  }

  const localRemoved = purgeLocalData();
  console.log(`Local data/*.json removed: ${localRemoved}`);

  console.log("\nDone. Users can sign up again at /signup.");
  console.log("Note: Twilio purchased numbers are NOT released — do that in Twilio Console if needed.");
  console.log("Tip: Remove TWILIO_DEFAULT_USER_ID from Vercel env before next signup.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
