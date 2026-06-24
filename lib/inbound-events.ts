import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

/** Twilio CDR-style inbound touch — logged 24/7 regardless of AI schedule. */
export type InboundEvent = {
  id: string;
  userId: string;
  callSid: string;
  from: string;
  to: string;
  /** initiated | ringing | answered | completed | voice_started | failed */
  status: string;
  direction?: string;
  durationSec?: number;
  aiScheduleActive?: boolean;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "inbound-events.json");

function kvKey(userId: string) {
  return `vowroad:inbound-events:${userId}`;
}

type Store = { events: InboundEvent[] };

async function readFileStore(): Promise<Store> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return { events: [] };
  }
}

async function writeFileStore(store: Store) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function readUserEvents(userId: string): Promise<InboundEvent[]> {
  if (useKvStore()) {
    const list = await kvGetSafe<InboundEvent[]>(kvKey(userId));
    return list ?? [];
  }
  const store = await readFileStore();
  return store.events.filter((e) => e.userId === userId);
}

async function appendUserEvents(userId: string, entry: InboundEvent): Promise<void> {
  if (useKvStore()) {
    const list = await readUserEvents(userId);
    list.push(entry);
    const trimmed = list.slice(-5000);
    await kv.set(kvKey(userId), trimmed);
    return;
  }
  const store = await readFileStore();
  store.events.push(entry);
  if (store.events.length > 50_000) {
    store.events = store.events.slice(-40_000);
  }
  await writeFileStore(store);
}

export async function recordInboundEvent(
  userId: string,
  input: Omit<InboundEvent, "id" | "userId" | "createdAt"> & { createdAt?: string },
): Promise<InboundEvent> {
  const entry: InboundEvent = {
    id: crypto.randomUUID(),
    userId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    callSid: input.callSid,
    from: input.from,
    to: input.to,
    status: input.status,
    direction: input.direction,
    durationSec: input.durationSec,
    aiScheduleActive: input.aiScheduleActive,
  };
  await appendUserEvents(userId, entry);
  return entry;
}

export async function listInboundEvents(
  userId: string,
  opts?: { since?: Date; limit?: number },
): Promise<InboundEvent[]> {
  const list = await readUserEvents(userId);
  const sinceMs = opts?.since?.getTime() ?? 0;
  const filtered = list
    .filter((e) => new Date(e.createdAt).getTime() >= sinceMs)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limit = opts?.limit ?? 2000;
  return filtered.slice(0, limit);
}
