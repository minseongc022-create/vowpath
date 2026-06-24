import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

const DATA_DIR = path.join(process.cwd(), "data");
const DEDUPE_FILE = path.join(DATA_DIR, "sms-dedupe.json");

function dedupeKey(userId: string, key: string) {
  return `vowroad:sms-sent:${userId}:${key}`;
}

type DedupeStore = Record<string, Record<string, boolean>>;

async function readFileStore(): Promise<DedupeStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(DEDUPE_FILE, "utf-8");
    return JSON.parse(raw) as DedupeStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: DedupeStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DEDUPE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** True if this SMS has not been sent yet for this booking + template. */
export async function shouldSendSmsOnce(
  userId: string,
  dedupeId: string,
): Promise<boolean> {
  if (useKvStore()) {
    const key = dedupeKey(userId, dedupeId);
    const existing = await kv.get<boolean>(key);
    return !existing;
  }

  const store = await readFileStore();
  return !store[userId]?.[dedupeId];
}

export async function markSmsSent(userId: string, dedupeId: string): Promise<void> {
  if (useKvStore()) {
    await kv.set(dedupeKey(userId, dedupeId), true, { ex: 60 * 60 * 24 * 120 });
    return;
  }

  const store = await readFileStore();
  store[userId] = { ...(store[userId] ?? {}), [dedupeId]: true };
  await writeFileStore(store);
}
