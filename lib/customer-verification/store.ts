import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import { normalizeSmsPhone } from "../phone";
import type { CustomerVerificationRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const VERIFY_FILE = path.join(DATA_DIR, "customer-verification.json");
const PENDING_INDEX_KEY = "effiroad:customer-verification-pending";

type VerifyStore = { records: Record<string, CustomerVerificationRecord> };

function recordKey(userId: string, bookingId: string) {
  return `${userId}:${bookingId}`;
}

function phoneIndexKey(userId: string, phone: string) {
  return `effiroad:cust-verify-phone:${userId}:${phone}`;
}

function kvRecordKey(userId: string, bookingId: string) {
  return `effiroad:customer-verification:${userId}:${bookingId}`;
}

function kvUserIndexKey(userId: string) {
  return `effiroad:customer-verification-index:${userId}`;
}

async function readFileStore(): Promise<VerifyStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(VERIFY_FILE, "utf-8");
    return JSON.parse(raw) as VerifyStore;
  } catch {
    return { records: {} };
  }
}

async function writeFileStore(store: VerifyStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(VERIFY_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export type PendingVerificationIndexEntry = {
  userId: string;
  bookingId: string;
  sentAt: string;
  reminderSentAt?: string;
};

async function readPendingIndex(): Promise<PendingVerificationIndexEntry[]> {
  if (useKvStore()) {
    return (await kv.get<PendingVerificationIndexEntry[]>(PENDING_INDEX_KEY)) ?? [];
  }
  if (process.env.VERCEL === "1") return [];
  const store = await readFileStore();
  return Object.values(store.records)
    .filter((r) => r.status === "pending_response")
    .map((r) => ({
      userId: r.userId,
      bookingId: r.bookingId,
      sentAt: r.sentAt,
      reminderSentAt: r.reminderSentAt,
    }));
}

async function writePendingIndex(entries: PendingVerificationIndexEntry[]) {
  if (useKvStore()) {
    await kv.set(PENDING_INDEX_KEY, entries);
    return;
  }
  if (process.env.VERCEL === "1") return;
}

async function upsertPendingIndex(record: CustomerVerificationRecord) {
  const entries = await readPendingIndex();
  const filtered = entries.filter(
    (e) => !(e.userId === record.userId && e.bookingId === record.bookingId),
  );
  if (record.status === "pending_response") {
    filtered.push({
      userId: record.userId,
      bookingId: record.bookingId,
      sentAt: record.sentAt,
      reminderSentAt: record.reminderSentAt,
    });
  }
  await writePendingIndex(filtered);
}

async function setPhoneIndex(record: CustomerVerificationRecord) {
  const phone = normalizeSmsPhone(record.customerPhone);
  if (!phone) return;
  const payload = { userId: record.userId, bookingId: record.bookingId };
  if (useKvStore()) {
    await kv.set(phoneIndexKey(record.userId, phone), payload, { ex: 86_400 * 2 });
    return;
  }
  if (process.env.VERCEL === "1") return;
}

async function clearPhoneIndex(userId: string, phoneRaw: string) {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone) return;
  if (useKvStore()) {
    await kv.del(phoneIndexKey(userId, phone));
  }
}

async function upsertUserIndex(record: CustomerVerificationRecord) {
  if (!useKvStore()) return;
  const key = kvUserIndexKey(record.userId);
  const existing =
    (await kv.get<string[]>(key)) ?? [];
  if (!existing.includes(record.bookingId)) {
    await kv.set(key, [record.bookingId, ...existing].slice(0, 500));
  }
}

export async function saveCustomerVerification(
  record: CustomerVerificationRecord,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvRecordKey(record.userId, record.bookingId), record);
    await upsertUserIndex(record);
    await upsertPendingIndex(record);
    if (record.status === "pending_response") {
      await setPhoneIndex(record);
    } else {
      await clearPhoneIndex(record.userId, record.customerPhone);
    }
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store.records[recordKey(record.userId, record.bookingId)] = record;
  await writeFileStore(store);
  await upsertPendingIndex(record);
}

export async function getCustomerVerification(
  userId: string,
  bookingId: string,
): Promise<CustomerVerificationRecord | null> {
  if (useKvStore()) {
    return (
      (await kv.get<CustomerVerificationRecord>(kvRecordKey(userId, bookingId))) ??
      null
    );
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  return store.records[recordKey(userId, bookingId)] ?? null;
}

export async function listCustomerVerifications(
  userId: string,
): Promise<CustomerVerificationRecord[]> {
  if (useKvStore()) {
    const ids = (await kv.get<string[]>(kvUserIndexKey(userId))) ?? [];
    if (!ids.length) return [];
    const rows = await Promise.all(
      ids.map((bookingId) => getCustomerVerification(userId, bookingId)),
    );
    return rows.filter(Boolean) as CustomerVerificationRecord[];
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  return Object.values(store.records).filter((r) => r.userId === userId);
}

export async function findPendingVerificationByPhone(
  fromRaw: string,
  userId?: string | null,
): Promise<CustomerVerificationRecord | null> {
  const phone = normalizeSmsPhone(fromRaw);
  if (!phone) return null;

  if (useKvStore()) {
    if (!userId) return null;
    const hit = await kv.get<{ userId: string; bookingId: string }>(
      phoneIndexKey(userId, phone),
    );
    if (!hit) return null;
    const record = await getCustomerVerification(hit.userId, hit.bookingId);
    if (!record || record.status !== "pending_response") return null;
    return record;
  }

  if (process.env.VERCEL === "1") return null;
  const store = await readFileStore();
  for (const record of Object.values(store.records)) {
    if (record.status !== "pending_response") continue;
    if (userId && record.userId !== userId) continue;
    if (normalizeSmsPhone(record.customerPhone) === phone) return record;
  }
  return null;
}

export async function listPendingVerificationIndex(): Promise<
  PendingVerificationIndexEntry[]
> {
  return readPendingIndex();
}
