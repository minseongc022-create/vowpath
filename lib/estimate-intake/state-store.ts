import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import type { EstimateState } from "./types";

const TTL_SECONDS = 7200;
const DATA_DIR = path.join(process.cwd(), "data");
const ESTIMATE_FILE = path.join(DATA_DIR, "estimate-intake-sessions.json");

type EstimateStore = { sessions: Record<string, EstimateState> };

function kvKey(userId: string, callSid: string) {
  return `effiroad:estimate-intake:${userId}:${callSid}`;
}

async function readFileStore(): Promise<EstimateStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(ESTIMATE_FILE, "utf-8");
    return JSON.parse(raw) as EstimateStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeFileStore(store: EstimateStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ESTIMATE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function sessionKey(state: EstimateState): string {
  return `${state.userId}:${state.callSid}`;
}

export async function getEstimateState(
  userId: string,
  callSid: string,
): Promise<EstimateState | null> {
  if (!callSid || !userId) return null;
  if (useKvStore()) {
    return (await kv.get<EstimateState>(kvKey(userId, callSid))) ?? null;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  return store.sessions[`${userId}:${callSid}`] ?? null;
}

export async function saveEstimateState(state: EstimateState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  if (useKvStore()) {
    await kv.set(kvKey(state.userId, state.callSid), state, { ex: TTL_SECONDS });
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store.sessions[sessionKey(state)] = state;
  await writeFileStore(store);
}

export async function deleteEstimateState(
  userId: string,
  callSid: string,
): Promise<void> {
  if (useKvStore()) {
    await kv.del(kvKey(userId, callSid));
    return;
  }
  const store = await readFileStore();
  delete store.sessions[`${userId}:${callSid}`];
  await writeFileStore(store);
}
