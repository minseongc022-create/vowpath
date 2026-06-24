import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

const TTL_SECONDS = 86_400;
const DATA_DIR = path.join(process.cwd(), "data");
const CORRECTION_FILE = path.join(DATA_DIR, "correction-intake-sessions.json");

export type CorrectionIntakeSession = {
  token: string;
  userId: string;
  bookingId: string;
  callId?: string;
  shopName: string;
  customerName: string;
  address: string;
  issueType: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

type CorrectionStore = { sessions: Record<string, CorrectionIntakeSession> };

function kvKey(token: string) {
  return `effiroad:correction-intake:${token}`;
}

async function readFileStore(): Promise<CorrectionStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(CORRECTION_FILE, "utf-8");
    return JSON.parse(raw) as CorrectionStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeFileStore(store: CorrectionStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CORRECTION_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function saveCorrectionSession(
  session: CorrectionIntakeSession,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(session.token), session, { ex: TTL_SECONDS });
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store.sessions[session.token] = session;
  await writeFileStore(store);
}

export async function getCorrectionSession(
  token: string,
): Promise<CorrectionIntakeSession | null> {
  if (!token) return null;
  if (useKvStore()) {
    return (await kvGetSafe<CorrectionIntakeSession>(kvKey(token))) ?? null;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  return store.sessions[token] ?? null;
}

export function isCorrectionSessionValid(
  session: CorrectionIntakeSession | null,
): boolean {
  if (!session || session.usedAt) return false;
  return new Date(session.expiresAt).getTime() > Date.now();
}

export async function markCorrectionSessionUsed(token: string): Promise<void> {
  const session = await getCorrectionSession(token);
  if (!session) return;
  session.usedAt = new Date().toISOString();
  await saveCorrectionSession(session);
}
