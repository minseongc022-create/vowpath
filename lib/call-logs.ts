import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";
import type { JobPriority } from "./types";

export type StoredCallLog = {
  id: string;
  userId: string;
  from: string;
  to: string;
  transcript: string;
  priority?: JobPriority;
  symptom?: string;
  customerName?: string;
  address?: string;
  arrivalWindow?: string;
  jobberRequestId?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const CALLS_FILE = path.join(DATA_DIR, "call-logs.json");

type CallStore = {
  calls: StoredCallLog[];
};

function kvKey(userId: string) {
  return `vowpath:calls:${userId}`;
}

async function readFileStore(): Promise<CallStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(CALLS_FILE, "utf-8");
    return JSON.parse(raw) as CallStore;
  } catch {
    return { calls: [] };
  }
}

async function writeFileStore(store: CallStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CALLS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function addCallLog(entry: StoredCallLog): Promise<void> {
  if (useKvStore()) {
    const existing = (await kv.get<StoredCallLog[]>(kvKey(entry.userId))) ?? [];
    await kv.set(kvKey(entry.userId), [entry, ...existing].slice(0, 100));
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store.calls.unshift(entry);
  await writeFileStore({ calls: store.calls.slice(0, 500) });
}

export async function listCallLogs(userId: string): Promise<StoredCallLog[]> {
  if (useKvStore()) {
    return (await kv.get<StoredCallLog[]>(kvKey(userId))) ?? [];
  }
  const store = await readFileStore();
  return store.calls.filter((c) => c.userId === userId).slice(0, 100);
}
