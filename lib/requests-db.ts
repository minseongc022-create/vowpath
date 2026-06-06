import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import {
  normalizeRequestStatus,
  type RequestStatus,
  REQUEST_STATUSES,
} from "./booking-policy";

/** Per-booking request workflow status (Pending → Approved / Rejected, plus scheduled/completed). */
export type RequestStatusMap = Record<string, RequestStatus>;

const DATA_DIR = path.join(process.cwd(), "data");
const REQUESTS_FILE = path.join(DATA_DIR, "requests-db.json");

/** Current KV key for tenant request statuses. */
function kvKey(userId: string) {
  return `vowpath:requests:${userId}`;
}

/** Legacy key — merged on read, not written after migration. */
function legacyKvKey(userId: string) {
  return `vowpath:booking-status:${userId}`;
}

function normalizeMap(raw: Record<string, string>): RequestStatusMap {
  return Object.fromEntries(
    Object.entries(raw).map(([id, s]) => [id, normalizeRequestStatus(s)]),
  );
}

async function readFileStore(): Promise<Record<string, RequestStatusMap>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(REQUESTS_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, RequestStatusMap>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, RequestStatusMap>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(REQUESTS_FILE, JSON.stringify(all, null, 2), "utf-8");
}

async function readLegacyBookingStatusFile(
  userId: string,
): Promise<RequestStatusMap> {
  const legacyPath = path.join(DATA_DIR, "booking-status.json");
  try {
    const raw = await readFile(legacyPath, "utf-8");
    const store = JSON.parse(raw) as Record<string, RequestStatusMap>;
    return normalizeMap((store[userId] ?? {}) as Record<string, string>);
  } catch {
    return {};
  }
}

async function mergeLegacyKv(
  userId: string,
  current: RequestStatusMap,
): Promise<RequestStatusMap> {
  const legacy = (await kvGetSafe<RequestStatusMap>(legacyKvKey(userId))) ?? {};
  if (Object.keys(legacy).length === 0) return current;
  return normalizeMap({ ...legacy, ...current } as Record<string, string>);
}

export async function getRequestStatuses(userId: string): Promise<RequestStatusMap> {
  if (useKvStore()) {
    const raw = (await kvGetSafe<RequestStatusMap>(kvKey(userId))) ?? {};
    let merged = normalizeMap(raw as Record<string, string>);
    merged = await mergeLegacyKv(userId, merged);
    return merged;
  }

  const store = await readFileStore();
  const user = store[userId] ?? {};
  const fromRequests = normalizeMap(user as Record<string, string>);
  const fromLegacy = await readLegacyBookingStatusFile(userId);
  return { ...fromLegacy, ...fromRequests };
}

export async function setRequestStatus(
  userId: string,
  bookingId: string,
  status: RequestStatus,
): Promise<RequestStatusMap> {
  const normalized = normalizeRequestStatus(status);
  if (!REQUEST_STATUSES.includes(normalized)) {
    throw new Error("INVALID_REQUEST_STATUS");
  }

  if (useKvStore()) {
    const existing = await getRequestStatuses(userId);
    const next = { ...existing, [bookingId]: normalized };
    await kv.set(kvKey(userId), next);
    return next;
  }

  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }

  const store = await readFileStore();
  const userStore = { ...(store[userId] ?? {}), [bookingId]: normalized };
  store[userId] = userStore;
  await writeFileStore(store);
  return userStore;
}

/** Set multiple booking ids to the same status in one write. */
export async function setRequestStatusesBulk(
  userId: string,
  updates: Record<string, RequestStatus>,
): Promise<RequestStatusMap> {
  const normalized = Object.fromEntries(
    Object.entries(updates).map(([id, s]) => [id, normalizeRequestStatus(s)]),
  );

  if (useKvStore()) {
    const existing = await getRequestStatuses(userId);
    const next = { ...existing, ...normalized };
    await kv.set(kvKey(userId), next);
    return next;
  }

  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }

  const store = await readFileStore();
  store[userId] = { ...(store[userId] ?? {}), ...normalized };
  await writeFileStore(store);
  return store[userId];
}
