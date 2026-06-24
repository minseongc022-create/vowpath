import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTEXT_FILE = path.join(DATA_DIR, "sms-reply-context.json");

function kvKey(userId: string) {
  return `effiroad:sms-reply-target:${userId}`;
}

async function readFileStore(): Promise<Record<string, string>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(CONTEXT_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeFileStore(store: Record<string, string>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONTEXT_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** Pin the booking that the next owner SMS 1/2 reply should apply to. */
export async function setSmsReplyTarget(
  userId: string,
  bookingId: string,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(userId), bookingId, { ex: 60 * 60 * 24 * 7 });
    return;
  }
  const store = await readFileStore();
  store[userId] = bookingId;
  await writeFileStore(store);
}

export async function getSmsReplyTarget(userId: string): Promise<string | null> {
  if (useKvStore()) {
    return (await kv.get<string>(kvKey(userId))) ?? null;
  }
  const store = await readFileStore();
  return store[userId] ?? null;
}

export async function clearSmsReplyTarget(userId: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(kvKey(userId));
    return;
  }
  const store = await readFileStore();
  delete store[userId];
  await writeFileStore(store);
}
