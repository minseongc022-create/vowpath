import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import type { RequestStatus } from "./booking-policy";
import type { JobPriority } from "./types";

export type CallMemoryRecord = {
  id: string;
  userId: string;
  callId: string;
  bookingId: string;
  customerName: string;
  phoneNumber: string;
  issue: string;
  requestedTime: string;
  summary: string;
  bookingStatus: RequestStatus;
  priority?: JobPriority;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCallMemoryInput = Omit<CallMemoryRecord, "id" | "updatedAt">;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "call-memory.json");

type Store = {
  records: CallMemoryRecord[];
};

function kvKey(userId: string) {
  return `vowpath:call-memory:${userId}`;
}

async function readFileStore(): Promise<Store> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(FILE, "utf-8")) as Store;
  } catch {
    return { records: [] };
  }
}

async function writeFileStore(store: Store) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

function mergeRecord(
  existing: CallMemoryRecord | undefined,
  input: UpsertCallMemoryInput,
): CallMemoryRecord {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    ...input,
    customerName: input.customerName.trim() || "Unknown customer",
    phoneNumber: input.phoneNumber.trim(),
    issue: input.issue.trim() || "Unknown issue",
    requestedTime: input.requestedTime.trim() || "Not requested",
    summary: input.summary.trim() || "No summary available.",
    updatedAt: new Date().toISOString(),
  };
}

export async function listCallMemory(userId: string): Promise<CallMemoryRecord[]> {
  let records: CallMemoryRecord[];
  if (useKvStore()) {
    records = (await kvGetSafe<CallMemoryRecord[]>(kvKey(userId))) ?? [];
  } else {
    records = (await readFileStore()).records.filter((r) => r.userId === userId);
  }
  return records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function upsertCallMemory(
  input: UpsertCallMemoryInput,
): Promise<CallMemoryRecord> {
  if (useKvStore()) {
    const existing = (await kv.get<CallMemoryRecord[]>(kvKey(input.userId))) ?? [];
    const idx = existing.findIndex((r) => r.bookingId === input.bookingId);
    const record = mergeRecord(idx >= 0 ? existing[idx] : undefined, input);
    const next =
      idx >= 0
        ? existing.map((r, i) => (i === idx ? record : r))
        : [record, ...existing];
    await kv.set(kvKey(input.userId), next.slice(0, 500));
    return record;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  const idx = store.records.findIndex(
    (r) => r.userId === input.userId && r.bookingId === input.bookingId,
  );
  const record = mergeRecord(idx >= 0 ? store.records[idx] : undefined, input);
  if (idx >= 0) store.records[idx] = record;
  else store.records.unshift(record);
  await writeFileStore({ records: store.records.slice(0, 1000) });
  return record;
}

export async function updateCallMemoryStatus(
  userId: string,
  bookingId: string,
  bookingStatus: RequestStatus,
): Promise<void> {
  const records = await listCallMemory(userId);
  const record = records.find((r) => r.bookingId === bookingId);
  if (!record) return;
  await upsertCallMemory({ ...record, bookingStatus });
}
