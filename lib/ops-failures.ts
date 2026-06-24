import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

export type OpsFailureCategory =
  | "twilio"
  | "ai"
  | "jobber"
  | "sms"
  | "email"
  | "address"
  | "intake"
  | "storage";

export type OpsFailureRecord = {
  id: string;
  userId?: string;
  category: OpsFailureCategory;
  operation: string;
  message: string;
  retryable: boolean;
  callSid?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FAILURES_FILE = path.join(DATA_DIR, "ops-failures.json");
const MAX_PER_USER = 200;
/** Same error is logged at most once per window (stops retry spam). */
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const SMS_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function kvKey(userId: string) {
  return `effiroad:ops-failures:${userId}`;
}

export function failureDedupeKey(
  f: Pick<OpsFailureRecord, "category" | "operation" | "message">,
): string {
  return `${f.category}|${f.operation}|${f.message}`;
}

function dedupeWindowMs(category: OpsFailureCategory): number {
  return category === "sms" ? SMS_DEDUPE_WINDOW_MS : DEDUPE_WINDOW_MS;
}

function isRecentDuplicate(
  existing: OpsFailureRecord[],
  record: OpsFailureRecord,
): boolean {
  const key = failureDedupeKey(record);
  const cutoff = Date.now() - dedupeWindowMs(record.category);
  return existing.some(
    (f) =>
      failureDedupeKey(f) === key &&
      new Date(f.createdAt).getTime() >= cutoff,
  );
}

/** Group identical failures for settings UI (newest first). */
export function collapseOperationFailures(
  failures: OpsFailureRecord[],
): Array<OpsFailureRecord & { repeatCount: number }> {
  const byKey = new Map<string, OpsFailureRecord & { repeatCount: number }>();
  const sorted = [...failures].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const f of sorted) {
    const key = failureDedupeKey(f);
    const prev = byKey.get(key);
    if (prev) {
      prev.repeatCount += 1;
    } else {
      byKey.set(key, { ...f, repeatCount: 1 });
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

type FailureStore = { failures: OpsFailureRecord[] };

async function readFileStore(): Promise<FailureStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FAILURES_FILE, "utf-8");
    return JSON.parse(raw) as FailureStore;
  } catch {
    return { failures: [] };
  }
}

async function writeFileStore(store: FailureStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FAILURES_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function logOperationFailure(
  input: Omit<OpsFailureRecord, "id" | "createdAt"> & { id?: string },
): Promise<OpsFailureRecord> {
  const record: OpsFailureRecord = {
    id: input.id ?? crypto.randomUUID(),
    userId: input.userId,
    category: input.category,
    operation: input.operation,
    message: input.message,
    retryable: input.retryable,
    callSid: input.callSid,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  };

  console.error(
    `[ops-failure] ${record.category}/${record.operation}`,
    record.message,
    record.callSid ?? "",
  );

  if (!record.userId) {
    if (!useKvStore()) {
      const store = await readFileStore();
      store.failures.unshift(record);
      await writeFileStore({ failures: store.failures.slice(0, 500) });
    }
    return record;
  }

  if (useKvStore()) {
    const existing =
      (await kv.get<OpsFailureRecord[]>(kvKey(record.userId))) ?? [];
    if (isRecentDuplicate(existing, record)) {
      return (
        existing.find((f) => failureDedupeKey(f) === failureDedupeKey(record)) ??
        record
      );
    }
    await kv.set(kvKey(record.userId), [record, ...existing].slice(0, MAX_PER_USER));
    return record;
  }

  if (process.env.VERCEL === "1") {
    return record;
  }

  const store = await readFileStore();
  const userRows = store.failures.filter((f) => f.userId === record.userId);
  if (record.userId && isRecentDuplicate(userRows, record)) {
    return (
      userRows.find((f) => failureDedupeKey(f) === failureDedupeKey(record)) ??
      record
    );
  }
  store.failures.unshift(record);
  await writeFileStore({ failures: store.failures.slice(0, 500) });
  return record;
}

export async function clearOperationFailures(userId: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(kvKey(userId));
    return;
  }
  const store = await readFileStore();
  store.failures = store.failures.filter((f) => f.userId !== userId);
  await writeFileStore(store);
}

export async function listOperationFailures(
  userId: string,
  limit = 50,
): Promise<OpsFailureRecord[]> {
  if (useKvStore()) {
    const rows = (await kv.get<OpsFailureRecord[]>(kvKey(userId))) ?? [];
    return rows.slice(0, limit);
  }
  const store = await readFileStore();
  return store.failures
    .filter((f) => f.userId === userId)
    .slice(0, limit);
}
