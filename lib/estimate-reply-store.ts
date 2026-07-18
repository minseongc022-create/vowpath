import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

export type PendingEstimateReply = {
  userId: string;
  callSid: string;
  customerPhone: string;
  customerName: string;
  createdAt: string;
};

function kvKey(userId: string) {
  return `effiroad:estimate-reply:${userId}`;
}

/** Pin the estimate request so the next owner free-text SMS relays to the customer. */
export async function setPendingEstimateReply(
  userId: string,
  pending: PendingEstimateReply,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(userId), pending, { ex: 60 * 60 * 72 });
    return;
  }
  const { mkdir, readFile, writeFile } = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "estimate-reply-pending.json");
  await mkdir(dir, { recursive: true });
  let store: Record<string, PendingEstimateReply> = {};
  try {
    store = JSON.parse(await readFile(file, "utf-8")) as Record<string, PendingEstimateReply>;
  } catch {
    /* empty */
  }
  store[userId] = pending;
  await writeFile(file, JSON.stringify(store, null, 2), "utf-8");
}

export async function getPendingEstimateReply(
  userId: string,
): Promise<PendingEstimateReply | null> {
  if (useKvStore()) {
    return (await kv.get<PendingEstimateReply>(kvKey(userId))) ?? null;
  }
  const path = await import("path");
  const file = path.join(process.cwd(), "data", "estimate-reply-pending.json");
  try {
    const { readFile } = await import("fs/promises");
    const store = JSON.parse(await readFile(file, "utf-8")) as Record<string, PendingEstimateReply>;
    return store[userId] ?? null;
  } catch {
    return null;
  }
}

export async function clearPendingEstimateReply(userId: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(kvKey(userId));
    return;
  }
  const path = await import("path");
  const file = path.join(process.cwd(), "data", "estimate-reply-pending.json");
  try {
    const { readFile, writeFile } = await import("fs/promises");
    const store = JSON.parse(await readFile(file, "utf-8")) as Record<string, PendingEstimateReply>;
    delete store[userId];
    await writeFile(file, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    /* empty */
  }
}