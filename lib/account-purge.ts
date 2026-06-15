import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";
import type { UserRecord } from "./users-db";

const USERS_KEY = "vowpath:users";

type UserStore = { users: UserRecord[] };

function kvRestConfig() {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

async function redisCmd(cfg: { url: string; token: string }, command: string[]) {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis REST ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ result: unknown }>;
}

async function scanAllKeys(pattern = "vowpath:*"): Promise<string[]> {
  const cfg = kvRestConfig();
  if (!cfg) return [];

  const keys = new Set<string>();
  let cursor = "0";
  do {
    const result = await redisCmd(cfg, [
      "SCAN",
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      "200",
    ]);
    const tuple = result.result as [string, string[]];
    cursor = String(tuple[0]);
    for (const key of tuple[1] ?? []) keys.add(key);
  } while (cursor !== "0");

  return [...keys];
}

async function deleteKeys(keys: string[]): Promise<number> {
  const cfg = kvRestConfig();
  if (!cfg || keys.length === 0) return 0;

  let deleted = 0;
  const chunkSize = 50;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    await redisCmd(cfg, ["DEL", ...chunk]);
    deleted += chunk.length;
  }
  return deleted;
}

export type AccountPurgeResult = {
  accountsRemoved: Array<{ id: string; email: string; shopName: string }>;
  kvKeysDeleted: number;
  kvEnabled: boolean;
};

export async function purgeAllAccounts(): Promise<AccountPurgeResult> {
  const kvEnabled = useKvStore();
  let accountsRemoved: AccountPurgeResult["accountsRemoved"] = [];

  if (kvEnabled) {
    const store = (await kv.get<UserStore>(USERS_KEY)) ?? { users: [] };
    accountsRemoved = store.users.map((u) => ({
      id: u.id,
      email: u.email,
      shopName: u.shopName,
    }));
  }

  const keys = kvEnabled ? await scanAllKeys() : [];
  const kvKeysDeleted = await deleteKeys(keys);

  return {
    accountsRemoved,
    kvKeysDeleted,
    kvEnabled,
  };
}
