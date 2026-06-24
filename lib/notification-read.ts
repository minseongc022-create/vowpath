import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

const DATA_DIR = path.join(process.cwd(), "data");
const READ_FILE = path.join(DATA_DIR, "notification-read.json");

function kvKey(userId: string) {
  return `effiroad:notification-read:${userId}`;
}

async function readFileStore(): Promise<Record<string, string[]>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(READ_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, string[]>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(READ_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function getReadNotificationIds(userId: string): Promise<string[]> {
  if (useKvStore()) {
    return (await kv.get<string[]>(kvKey(userId))) ?? [];
  }
  const store = await readFileStore();
  return store[userId] ?? [];
}

export async function markNotificationsRead(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return getReadNotificationIds(userId);

  if (useKvStore()) {
    const existing = (await kv.get<string[]>(kvKey(userId))) ?? [];
    const next = [...new Set([...existing, ...ids])].slice(-500);
    await kv.set(kvKey(userId), next);
    return next;
  }

  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }

  const store = await readFileStore();
  const merged = [...new Set([...(store[userId] ?? []), ...ids])].slice(-500);
  store[userId] = merged;
  await writeFileStore(store);
  return merged;
}

export async function markAllNotificationsRead(
  userId: string,
  allIds: string[],
): Promise<string[]> {
  return markNotificationsRead(userId, allIds);
}
