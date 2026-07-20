import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";
import { kvGetSafe } from "./kv-safe";

export type EstimateShareRecord = {
  userId: string;
  jobId: string;
  estimateId: string;
  createdAt: string;
};

function shareKey(token: string) {
  return `effiroad:estimate-share:${token}`;
}

export async function saveEstimateShare(
  token: string,
  record: EstimateShareRecord,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(shareKey(token), record, { ex: 60 * 60 * 24 * 90 });
    return;
  }
  const { mkdir, readFile, writeFile } = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "estimate-shares.json");
  await mkdir(dir, { recursive: true });
  let store: Record<string, EstimateShareRecord> = {};
  try {
    store = JSON.parse(await readFile(file, "utf-8")) as Record<string, EstimateShareRecord>;
  } catch {
    /* empty */
  }
  store[token] = record;
  await writeFile(file, JSON.stringify(store, null, 2), "utf-8");
}

export async function getEstimateShare(
  token: string,
): Promise<EstimateShareRecord | null> {
  if (useKvStore()) {
    return (await kvGetSafe<EstimateShareRecord>(shareKey(token))) ?? null;
  }
  const path = await import("path");
  const file = path.join(process.cwd(), "data", "estimate-shares.json");
  try {
    const { readFile } = await import("fs/promises");
    const store = JSON.parse(await readFile(file, "utf-8")) as Record<
      string,
      EstimateShareRecord
    >;
    return store[token] ?? null;
  } catch {
    return null;
  }
}

export function newEstimateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
}
