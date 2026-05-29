import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

export type SignupChannel = "email" | "sms";

export type PendingSignup = {
  id: string;
  email: string;
  passwordHash: string;
  shopName: string;
  phone?: string;
  channel: SignupChannel;
  codeHash: string;
  attempts: number;
  verified: boolean;
  expiresAt: number;
  createdAt: string;
};

const KV_PREFIX = "vowpath:signup:";
const DATA_DIR = path.join(process.cwd(), "data");
const SIGNUPS_FILE = path.join(DATA_DIR, "pending-signups.json");

type SignupFileStore = Record<string, PendingSignup>;

async function readFileStore(): Promise<SignupFileStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(SIGNUPS_FILE, "utf-8");
    return JSON.parse(raw) as SignupFileStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: SignupFileStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SIGNUPS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function savePendingSignup(request: PendingSignup) {
  if (useKvStore()) {
    await kv.set(`${KV_PREFIX}${request.id}`, request, { ex: 60 * 15 });
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store[request.id] = request;
  await writeFileStore(store);
}

export async function getPendingSignup(id: string): Promise<PendingSignup | null> {
  if (useKvStore()) {
    return (await kv.get<PendingSignup>(`${KV_PREFIX}${id}`)) ?? null;
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

export async function updatePendingSignup(request: PendingSignup) {
  await savePendingSignup(request);
}

export async function deletePendingSignup(id: string) {
  if (useKvStore()) {
    await kv.del(`${KV_PREFIX}${id}`);
    return;
  }
  const store = await readFileStore();
  delete store[id];
  await writeFileStore(store);
}

const RATE_KV_PREFIX = "vowpath:ratelimit:signup:";

export async function getSignupAttemptCount(key: string): Promise<number> {
  const normalized = key.trim().toLowerCase();
  if (useKvStore()) {
    return (await kv.get<number>(`${RATE_KV_PREFIX}${normalized}`)) ?? 0;
  }
  return 0;
}

export async function incrementSignupAttemptCount(key: string): Promise<number> {
  const normalized = key.trim().toLowerCase();
  if (useKvStore()) {
    const next = ((await kv.get<number>(`${RATE_KV_PREFIX}${normalized}`)) ?? 0) + 1;
    await kv.set(`${RATE_KV_PREFIX}${normalized}`, next, { ex: 60 * 60 });
    return next;
  }
  return 1;
}
