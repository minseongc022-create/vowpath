import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { normalizeSmsPhone } from "./phone";

type SuppressionStore = Record<string, string>;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "sms-suppression.json");

function kvKey(userId: string, phone: string) {
  return `effiroad:sms-optout:${userId}:${phone}`;
}

function fileKey(userId: string, phone: string) {
  return `${userId}:${phone}`;
}

async function readFileStore(): Promise<SuppressionStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as SuppressionStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: SuppressionStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** Customer opted out of SMS for this shop (TCPA STOP). */
export async function isSmsOptedOut(userId: string, phoneRaw: string): Promise<boolean> {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone) return false;
  if (useKvStore()) {
    const at = await kvGetSafe<string>(kvKey(userId, phone));
    return Boolean(at);
  }
  const store = await readFileStore();
  return Boolean(store[fileKey(userId, phone)]);
}

export async function setSmsOptOut(
  userId: string,
  phoneRaw: string,
): Promise<void> {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone) return;
  const at = new Date().toISOString();
  if (useKvStore()) {
    await kv.set(kvKey(userId, phone), at);
    return;
  }
  const store = await readFileStore();
  store[fileKey(userId, phone)] = at;
  await writeFileStore(store);
}

export async function clearSmsOptOut(
  userId: string,
  phoneRaw: string,
): Promise<void> {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone) return;
  if (useKvStore()) {
    await kv.del(kvKey(userId, phone));
    return;
  }
  const store = await readFileStore();
  delete store[fileKey(userId, phone)];
  await writeFileStore(store);
}
