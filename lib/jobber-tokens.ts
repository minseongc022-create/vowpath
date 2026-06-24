import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

export type JobberTokenRecord = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId?: string;
  accountName?: string;
  accountEmail?: string;
  accountPhone?: string;
  updatedAt: string;
};

const KV_PREFIX = "effiroad:jobber:";
const DATA_DIR = path.join(process.cwd(), "data");
const TOKENS_FILE = path.join(DATA_DIR, "jobber-tokens.json");

type TokenStore = {
  tokens: JobberTokenRecord[];
};

function kvKey(userId: string) {
  return `${KV_PREFIX}${userId}`;
}

async function readFileStore(): Promise<TokenStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(TOKENS_FILE, "utf-8");
    return JSON.parse(raw) as TokenStore;
  } catch {
    return { tokens: [] };
  }
}

async function writeFileStore(store: TokenStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TOKENS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function getJobberTokens(
  userId: string,
): Promise<JobberTokenRecord | null> {
  if (useKvStore()) {
    return (await kvGetSafe<JobberTokenRecord>(kvKey(userId))) ?? null;
  }
  const store = await readFileStore();
  return store.tokens.find((t) => t.userId === userId) ?? null;
}

export async function saveJobberTokens(record: JobberTokenRecord): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(record.userId), record);
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  const next = store.tokens.filter((t) => t.userId !== record.userId);
  next.push(record);
  await writeFileStore({ tokens: next });
}

export async function deleteJobberTokens(userId: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(kvKey(userId));
    return;
  }
  const store = await readFileStore();
  await writeFileStore({
    tokens: store.tokens.filter((t) => t.userId !== userId),
  });
}
