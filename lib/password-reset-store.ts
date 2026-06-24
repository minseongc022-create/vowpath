import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

export type ResetChannel = "email" | "sms";

export type ResetRequest = {
  id: string;
  userId: string;
  email: string;
  phone?: string;
  channel: ResetChannel;
  codeHash: string;
  attempts: number;
  expiresAt: number;
  createdAt: string;
};

const KV_PREFIX = "effiroad:reset:";
const DATA_DIR = path.join(process.cwd(), "data");
const RESETS_FILE = path.join(DATA_DIR, "password-resets.json");

type ResetFileStore = Record<string, ResetRequest>;

async function readFileStore(): Promise<ResetFileStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(RESETS_FILE, "utf-8");
    return JSON.parse(raw) as ResetFileStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: ResetFileStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(RESETS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function saveResetRequest(request: ResetRequest) {
  if (useKvStore()) {
    await kv.set(`${KV_PREFIX}${request.id}`, request, {
      ex: 60 * 15,
    });
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store[request.id] = request;
  await writeFileStore(store);
}

export async function getResetRequest(id: string): Promise<ResetRequest | null> {
  if (useKvStore()) {
    return (await kv.get<ResetRequest>(`${KV_PREFIX}${id}`)) ?? null;
  }
  const store = await readFileStore();
  const request = store[id];
  if (!request) return null;
  if (request.expiresAt < Date.now()) {
    delete store[id];
    await writeFileStore(store);
    return null;
  }
  return request;
}

export async function updateResetRequest(request: ResetRequest) {
  await saveResetRequest(request);
}

export async function deleteResetRequest(id: string) {
  if (useKvStore()) {
    await kv.del(`${KV_PREFIX}${id}`);
    return;
  }
  const store = await readFileStore();
  delete store[id];
  await writeFileStore(store);
}

const RATE_KV_PREFIX = "effiroad:ratelimit:forgot:";

export async function getForgotAttemptCount(key: string): Promise<number> {
  const normalized = key.trim().toLowerCase();
  if (useKvStore()) {
    return (await kv.get<number>(`${RATE_KV_PREFIX}${normalized}`)) ?? 0;
  }
  return 0;
}

export async function incrementForgotAttemptCount(key: string): Promise<number> {
  const normalized = key.trim().toLowerCase();
  if (useKvStore()) {
    const next = ((await kv.get<number>(`${RATE_KV_PREFIX}${normalized}`)) ?? 0) + 1;
    await kv.set(`${RATE_KV_PREFIX}${normalized}`, next, { ex: 60 * 60 });
    return next;
  }
  return 1;
}
