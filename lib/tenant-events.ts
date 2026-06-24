import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

export type TenantEventType =
  | "service_request_created"
  | "service_request_approved"
  | "service_request_rejected"
  | "service_request_scheduled"
  | "service_request_completed"
  | "customer_corrected"
  | "customer_verified"
  | "booking_jobber_synced"
  | "emergency_call"
  | "callback_requested"
  | "voicemail_received"
  | "jobber_sync_failed"
  | "call_intake_failed"
  | "sms_delivery_failed"
  | "security"
  | "workflow_rule_matched";

export type TenantEvent = {
  id: string;
  userId: string;
  type: TenantEventType;
  title: string;
  body: string;
  bookingId?: string;
  callId?: string;
  href?: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
};

const MAX_EVENTS = 500;
const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "tenant-events.json");

type EventStore = { byUser: Record<string, TenantEvent[]> };

function kvKey(userId: string) {
  return `effiroad:tenant-events:${userId}`;
}

async function readFileStore(): Promise<EventStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(EVENTS_FILE, "utf-8");
    return JSON.parse(raw) as EventStore;
  } catch {
    return { byUser: {} };
  }
}

async function writeFileStore(store: EventStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(EVENTS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function mergeEventList(existing: TenantEvent[], record: TenantEvent): TenantEvent[] {
  const withoutDup = record.id ? existing.filter((e) => e.id !== record.id) : existing;
  return [record, ...withoutDup].slice(0, MAX_EVENTS);
}

export async function appendTenantEvent(
  event: Omit<TenantEvent, "id" | "createdAt"> & { id?: string; createdAt?: string },
): Promise<TenantEvent> {
  const record: TenantEvent = {
    ...event,
    id: event.id ?? crypto.randomUUID(),
    createdAt: event.createdAt ?? new Date().toISOString(),
  };

  if (useKvStore()) {
    const existing = (await kv.get<TenantEvent[]>(kvKey(record.userId))) ?? [];
    await kv.set(kvKey(record.userId), mergeEventList(existing, record));
    return record;
  }

  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }

  const store = await readFileStore();
  const list = store.byUser[record.userId] ?? [];
  store.byUser[record.userId] = mergeEventList(list, record);
  await writeFileStore(store);
  return record;
}

export async function listTenantEvents(
  userId: string,
  options: { since?: string; limit?: number; types?: TenantEventType[] } = {},
): Promise<TenantEvent[]> {
  const limit = options.limit ?? 100;
  let rows: TenantEvent[] = [];

  if (useKvStore()) {
    rows = (await kv.get<TenantEvent[]>(kvKey(userId))) ?? [];
  } else if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  } else {
    const store = await readFileStore();
    rows = store.byUser[userId] ?? [];
  }

  let filtered = rows;
  if (options.since) {
    const t = new Date(options.since).getTime();
    filtered = filtered.filter((e) => new Date(e.createdAt).getTime() >= t);
  }
  if (options.types?.length) {
    const set = new Set(options.types);
    filtered = filtered.filter((e) => set.has(e.type));
  }

  return filtered.slice(0, limit);
}

export const NOTIFICATION_EVENT_TYPES: TenantEventType[] = [
  "service_request_created",
  "emergency_call",
  "callback_requested",
  "voicemail_received",
  "jobber_sync_failed",
  "sms_delivery_failed",
];

export const AUDIT_EVENT_TYPES: TenantEventType[] = [
  "service_request_created",
  "service_request_approved",
  "service_request_rejected",
  "service_request_scheduled",
  "service_request_completed",
  "customer_corrected",
  "customer_verified",
  "booking_jobber_synced",
  "call_intake_failed",
  "security",
  "workflow_rule_matched",
];
