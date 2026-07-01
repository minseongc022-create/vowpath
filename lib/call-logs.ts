import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import type { JobPriority } from "./types";
import type { PrioritySource, ServicePriority } from "./service-priority";
import { resolvePriorityFields } from "./service-priority";

import type {
  FieldConfidence,
  IntakeChannel,
  StoredAddressValidation,
  StoredVerifiedFields,
} from "./call-intake/types";

export type StoredCallLog = {
  id: string;
  userId: string;
  from: string;
  to: string;
  transcript: string;
  /** Higher-accuracy full-call transcript from Deepgram post-call re-transcription */
  deepgramTranscript?: string;
  priority?: JobPriority;
  servicePriority?: ServicePriority;
  priorityReasons?: string[];
  prioritySource?: PrioritySource;
  priorityOverriddenAt?: string;
  symptom?: string;
  customerName?: string;
  address?: string;
  serviceLocation?: string;
  issueType?: string;
  arrivalWindow?: string;
  jobberRequestId?: string;
  callSid?: string;
  recordingUrl?: string;
  aiSummary?: string;
  callbackPhone?: string;
  confidence?: FieldConfidence;
  verificationComplete?: boolean;
  intakeChannel?: IntakeChannel;
  intakePhotoRef?: string;
  addressValidation?: StoredAddressValidation;
  verifiedFields?: StoredVerifiedFields;
  /** Customer portal link token (SMS manage booking) */
  portalToken?: string;
  lossCategory?: string;
  insuranceCarrier?: string;
  insuranceClaimNumber?: string;
  waterSource?: string;
  activeLoss?: boolean;
  severity?: string;
  lastServiceYear?: string;
  urgency?: string;
  dispatchNotes?: string;
  jobberPasteBlock?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const CALLS_FILE = path.join(DATA_DIR, "call-logs.json");

type CallStore = {
  calls: StoredCallLog[];
};

function kvKey(userId: string) {
  return `effiroad:calls:${userId}`;
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

function withResolvedPriority(entry: StoredCallLog): StoredCallLog {
  const fields = resolvePriorityFields(entry);
  return { ...entry, ...fields };
}

export async function addCallLog(entry: StoredCallLog): Promise<void> {
  const normalized = withResolvedPriority(entry);
  if (useKvStore()) {
    const existing = (await kv.get<StoredCallLog[]>(kvKey(normalized.userId))) ?? [];
    await kv.set(kvKey(normalized.userId), [normalized, ...existing].slice(0, 100));
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store.calls.unshift(normalized);
  await writeFileStore({ calls: store.calls.slice(0, 500) });
}

export async function patchCallLog(
  userId: string,
  callId: string,
  patch: Partial<
    Pick<
      StoredCallLog,
      | "priority"
      | "servicePriority"
      | "priorityReasons"
      | "prioritySource"
      | "priorityOverriddenAt"
      | "customerName"
      | "address"
      | "serviceLocation"
      | "issueType"
      | "symptom"
      | "aiSummary"
      | "transcript"
      | "deepgramTranscript"
      | "arrivalWindow"
      | "callbackPhone"
      | "portalToken"
      | "confidence"
      | "lossCategory"
      | "insuranceCarrier"
      | "insuranceClaimNumber"
      | "waterSource"
      | "activeLoss"
      | "severity"
      | "lastServiceYear"
      | "urgency"
      | "dispatchNotes"
      | "jobberPasteBlock"
    >
  >,
): Promise<StoredCallLog | null> {
  const apply = (rows: StoredCallLog[]) => {
    const idx = rows.findIndex((c) => c.userId === userId && c.id === callId);
    if (idx < 0) return null;
    const merged = withResolvedPriority({ ...rows[idx], ...patch });
    rows[idx] = merged;
    return merged;
  };

  if (useKvStore()) {
    const existing = (await kv.get<StoredCallLog[]>(kvKey(userId))) ?? [];
    const updated = apply(existing);
    if (!updated) return null;
    await kv.set(kvKey(userId), existing);
    return updated;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  const updated = apply(store.calls);
  if (!updated) return null;
  await writeFileStore(store);
  return updated;
}

export async function updateCallLogJobberRequest(
  userId: string,
  callId: string,
  jobberRequestId: string,
): Promise<boolean> {
  if (useKvStore()) {
    const existing = (await kv.get<StoredCallLog[]>(kvKey(userId))) ?? [];
    const idx = existing.findIndex((c) => c.id === callId);
    if (idx < 0) return false;
    existing[idx] = { ...existing[idx], jobberRequestId };
    await kv.set(kvKey(userId), existing);
    return true;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  const idx = store.calls.findIndex((c) => c.userId === userId && c.id === callId);
  if (idx < 0) return false;
  store.calls[idx] = { ...store.calls[idx], jobberRequestId };
  await writeFileStore(store);
  return true;
}

export async function updateCallLogRecording(
  userId: string,
  callSid: string,
  recordingUrl: string,
): Promise<boolean> {
  if (useKvStore()) {
    const existing = (await kv.get<StoredCallLog[]>(kvKey(userId))) ?? [];
    const idx = existing.findIndex((c) => c.callSid === callSid);
    if (idx < 0) return false;
    existing[idx] = { ...existing[idx], recordingUrl };
    await kv.set(kvKey(userId), existing);
    return true;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  const idx = store.calls.findIndex((c) => c.userId === userId && c.callSid === callSid);
  if (idx < 0) return false;
  store.calls[idx] = { ...store.calls[idx], recordingUrl };
  await writeFileStore(store);
  return true;
}

export async function findCallLogByCallSid(
  userId: string,
  callSid: string,
): Promise<StoredCallLog | null> {
  const calls = await listCallLogs(userId);
  return calls.find((c) => c.callSid === callSid) ?? null;
}

/** Most recent prior call from this caller ID with a usable name + address, for the
 * "Welcome back" returning-customer greeting. listCallLogs is already newest-first. */
export async function findRecentCallLogByPhone(
  userId: string,
  phone: string,
): Promise<StoredCallLog | null> {
  const normalized = phone.trim();
  if (!normalized) return null;
  const calls = await listCallLogs(userId);
  return (
    calls.find(
      (c) =>
        c.from === normalized &&
        c.customerName?.trim() &&
        c.customerName.trim().toLowerCase() !== "unknown" &&
        c.address?.trim() &&
        c.address.trim().toLowerCase() !== "unknown",
    ) ?? null
  );
}

function filterByIsoRange(
  rows: StoredCallLog[],
  start?: string,
  end?: string,
): StoredCallLog[] {
  if (!start && !end) return rows;
  const startMs = start ? new Date(`${start}T00:00:00.000Z`).getTime() : 0;
  const endMs = end ? new Date(`${end}T23:59:59.999Z`).getTime() : Number.MAX_SAFE_INTEGER;
  return rows.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t >= startMs && t <= endMs;
  });
}

export async function listCallLogs(
  userId: string,
  range?: { start?: string; end?: string },
): Promise<StoredCallLog[]> {
  let rows: StoredCallLog[] = [];
  if (useKvStore()) {
    rows = (await kvGetSafe<StoredCallLog[]>(kvKey(userId))) ?? [];
  } else {
    const store = await readFileStore();
    rows = store.calls.filter((c) => c.userId === userId);
  }
  const filtered = filterByIsoRange(rows, range?.start, range?.end);
  return filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 500)
    .map((call) => ({ ...call, ...resolvePriorityFields(call) }));
}
