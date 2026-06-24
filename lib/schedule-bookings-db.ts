import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { appendTenantEvent } from "./tenant-events";

export type ScheduledBookingRecord = {
  bookingId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  arrivalWindowLabel: string;
  slotSource: "jobber" | "native";
  jobberRequestId?: string;
  jobberJobId?: string;
  jobberVisitId?: string;
  undoExpiresAt?: string;
  createdAt: string;
};

type Store = Record<string, ScheduledBookingRecord>;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "schedule-bookings.json");

function kvKey(userId: string) {
  return `effiroad:schedule-bookings:${userId}`;
}

async function readFileStore(): Promise<Record<string, Store>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Record<string, Store>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, Store>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2), "utf-8");
}

async function readStore(userId: string): Promise<Store> {
  if (useKvStore()) {
    return (await kvGetSafe<Store>(kvKey(userId))) ?? {};
  }
  const all = await readFileStore();
  return all[userId] ?? {};
}

async function writeStore(userId: string, store: Store): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(userId), store);
    return;
  }
  const all = await readFileStore();
  all[userId] = store;
  await writeFileStore(all);
}

export async function getScheduledBooking(
  userId: string,
  bookingId: string,
): Promise<ScheduledBookingRecord | null> {
  const store = await readStore(userId);
  return store[bookingId] ?? null;
}

export async function listScheduledBookings(
  userId: string,
  from?: Date,
  to?: Date,
): Promise<ScheduledBookingRecord[]> {
  const store = await readStore(userId);
  const rows = Object.values(store);
  if (!from && !to) {
    return rows.sort(
      (a, b) =>
        new Date(a.scheduledStartAt).getTime() -
        new Date(b.scheduledStartAt).getTime(),
    );
  }
  const fromMs = from?.getTime() ?? 0;
  const toMs = to?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return rows
    .filter((r) => {
      const start = new Date(r.scheduledStartAt).getTime();
      return start >= fromMs && start <= toMs;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledStartAt).getTime() -
        new Date(b.scheduledStartAt).getTime(),
    );
}

export async function upsertScheduledBooking(
  userId: string,
  record: Omit<ScheduledBookingRecord, "createdAt"> & { createdAt?: string },
): Promise<ScheduledBookingRecord> {
  const store = await readStore(userId);
  const existing = store[record.bookingId];
  const next: ScheduledBookingRecord = {
    ...record,
    createdAt: existing?.createdAt ?? record.createdAt ?? new Date().toISOString(),
  };
  store[record.bookingId] = next;
  await writeStore(userId, store);
  try {
    await appendTenantEvent({
      userId,
      type: "service_request_scheduled",
      title: "Calendar updated",
      body: `${next.arrivalWindowLabel || "Scheduled visit"} · ${next.scheduledStartAt}`,
      bookingId: next.bookingId,
      href: `/dashboard/bookings/${encodeURIComponent(next.bookingId)}`,
      urgency: "medium",
    });
  } catch (e) {
    console.warn("[schedule-bookings-db] timeline event", e);
  }
  return next;
}

export async function deleteScheduledBooking(
  userId: string,
  bookingId: string,
): Promise<void> {
  const store = await readStore(userId);
  delete store[bookingId];
  await writeStore(userId, store);
}
