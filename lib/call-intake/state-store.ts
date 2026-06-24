import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import type { CallIntakeState } from "./types";

const TTL_SECONDS = 7200;
const DATA_DIR = path.join(process.cwd(), "data");
const INTAKE_FILE = path.join(DATA_DIR, "call-intake-sessions.json");

type IntakeStore = { sessions: Record<string, CallIntakeState> };

function kvKey(userId: string, callSid: string) {
  return `vowroad:call-intake:${userId}:${callSid}`;
}

async function readFileStore(): Promise<IntakeStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(INTAKE_FILE, "utf-8");
    return JSON.parse(raw) as IntakeStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeFileStore(store: IntakeStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INTAKE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function sessionKey(state: CallIntakeState): string {
  return `${state.userId}:${state.callSid}`;
}

export async function getIntakeState(
  userId: string,
  callSid: string,
): Promise<CallIntakeState | null> {
  if (!callSid || !userId) return null;
  if (useKvStore()) {
    return (
      (await kv.get<CallIntakeState>(kvKey(userId, callSid))) ??
      (await kv.get<CallIntakeState>(`vowroad:call-intake:${callSid}`)) ??
      null
    );
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  const fileKey = `${userId}:${callSid}`;
  return store.sessions[fileKey] ?? store.sessions[callSid] ?? null;
}

export async function saveIntakeState(state: CallIntakeState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const key = sessionKey(state);
  if (useKvStore()) {
    await kv.set(kvKey(state.userId, state.callSid), state, { ex: TTL_SECONDS });
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store.sessions[key] = state;
  await writeFileStore(store);
}

export async function deleteIntakeState(
  userId: string,
  callSid: string,
): Promise<void> {
  if (useKvStore()) {
    await kv.del(kvKey(userId, callSid));
    await kv.del(`vowroad:call-intake:${callSid}`);
    return;
  }
  const store = await readFileStore();
  delete store.sessions[`${userId}:${callSid}`];
  delete store.sessions[callSid];
  await writeFileStore(store);
}
