import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

export type TenantPhoneRecord = {
  phoneNumber: string;
  twilioSid: string;
  provisionedAt: string;
  areaCode?: string;
  legacy?: boolean;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "tenant-phones.json");

function kvKey(userId: string) {
  return `vowroad:tenant-inbound-phone:${userId}`;
}

type FileStore = { records: Record<string, TenantPhoneRecord> };

async function readFileStore(): Promise<FileStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as FileStore;
  } catch {
    return { records: {} };
  }
}

async function writeFileStore(store: FileStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function getTenantPhoneRecord(
  userId: string,
): Promise<TenantPhoneRecord | null> {
  if (useKvStore()) {
    const rec = await kvGetSafe<TenantPhoneRecord>(kvKey(userId));
    return rec ?? null;
  }
  const store = await readFileStore();
  return store.records[userId] ?? null;
}

export async function setTenantPhoneRecord(
  userId: string,
  record: TenantPhoneRecord,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(userId), record);
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  store.records[userId] = record;
  await writeFileStore(store);
}
