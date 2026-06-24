import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { useKvStore } from "../kv-config";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "workflow-booking-tags.json");

type TagStore = Record<string, Record<string, string[]>>;

function kvKey(userId: string) {
  return `vowroad:workflow-booking-tags:${userId}`;
}

async function readFileStore(): Promise<TagStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(FILE, "utf-8")) as TagStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: TagStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function getWorkflowBookingTags(
  userId: string,
  bookingId: string,
): Promise<string[]> {
  if (useKvStore()) {
    const map = (await kvGetSafe<Record<string, string[]>>(kvKey(userId))) ?? {};
    return map[bookingId] ?? [];
  }
  const store = await readFileStore();
  return store[userId]?.[bookingId] ?? [];
}

export async function appendWorkflowBookingTags(
  userId: string,
  bookingId: string,
  tags: string[],
): Promise<string[]> {
  if (!tags.length) return getWorkflowBookingTags(userId, bookingId);
  const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  if (useKvStore()) {
    const map = (await kvGetSafe<Record<string, string[]>>(kvKey(userId))) ?? {};
    const merged = [...new Set([...(map[bookingId] ?? []), ...unique])];
    map[bookingId] = merged;
    await kv.set(kvKey(userId), map);
    return merged;
  }
  const store = await readFileStore();
  const userMap = store[userId] ?? {};
  const merged = [...new Set([...(userMap[bookingId] ?? []), ...unique])];
  userMap[bookingId] = merged;
  store[userId] = userMap;
  await writeFileStore(store);
  return merged;
}
