import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import type { JobCard } from "./types";
import { resolvePriorityFields } from "./service-priority";

export type StoredJob = JobCard & {
  userId: string;
  sourceCallId?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

type JobStore = {
  jobs: StoredJob[];
};

function kvKey(userId: string) {
  return `vowroad:jobs:${userId}`;
}

async function readFileStore(): Promise<JobStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(JOBS_FILE, "utf-8");
    return JSON.parse(raw) as JobStore;
  } catch {
    return { jobs: [] };
  }
}

async function writeFileStore(store: JobStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(JOBS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function filterJobsByRange(
  jobs: StoredJob[],
  range?: { start?: string; end?: string },
): StoredJob[] {
  if (!range?.start && !range?.end) return jobs;
  const startMs = range.start
    ? new Date(`${range.start}T00:00:00.000Z`).getTime()
    : 0;
  const endMs = range.end
    ? new Date(`${range.end}T23:59:59.999Z`).getTime()
    : Number.MAX_SAFE_INTEGER;
  return jobs.filter((j) => {
    const t = new Date(j.createdAt).getTime();
    return t >= startMs && t <= endMs;
  });
}

export async function listJobs(
  userId: string,
  range?: { start?: string; end?: string },
): Promise<StoredJob[]> {
  let rows: StoredJob[] = [];
  if (useKvStore()) {
    rows = (await kvGetSafe<StoredJob[]>(kvKey(userId))) ?? [];
  } else {
    const store = await readFileStore();
    rows = store.jobs.filter((j) => j.userId === userId);
  }
  const filtered = filterJobsByRange(rows, range);
  return filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 200)
    .map((job) => ({ ...job, ...resolvePriorityFields(job) }));
}

export async function addJobRecord(
  userId: string,
  input: Omit<JobCard, "id" | "createdAt"> & { sourceCallId?: string },
): Promise<StoredJob> {
  const entry: StoredJob = {
    ...input,
    ...resolvePriorityFields(input),
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    sourceCallId: input.sourceCallId,
  };

  if (useKvStore()) {
    const existing = (await kv.get<StoredJob[]>(kvKey(userId))) ?? [];
    await kv.set(kvKey(userId), [entry, ...existing].slice(0, 200));
    return entry;
  }

  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }

  const store = await readFileStore();
  store.jobs.unshift(entry);
  await writeFileStore({ jobs: store.jobs.slice(0, 500) });
  return entry;
}

export async function patchJobRecord(
  userId: string,
  jobId: string,
  patch: Partial<
    Pick<
      JobCard,
      | "priority"
      | "servicePriority"
      | "priorityReasons"
      | "prioritySource"
      | "priorityOverriddenAt"
    >
  >,
): Promise<StoredJob | null> {
  if (useKvStore()) {
    const existing = (await kv.get<StoredJob[]>(kvKey(userId))) ?? [];
    const idx = existing.findIndex((j) => j.id === jobId);
    if (idx < 0) return null;
    const merged: StoredJob = {
      ...existing[idx],
      ...resolvePriorityFields({ ...existing[idx], ...patch }),
    };
    existing[idx] = merged;
    await kv.set(kvKey(userId), existing);
    return merged;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  const store = await readFileStore();
  const idx = store.jobs.findIndex((j) => j.id === jobId && j.userId === userId);
  if (idx < 0) return null;
  const merged: StoredJob = {
    ...store.jobs[idx],
    ...resolvePriorityFields({ ...store.jobs[idx], ...patch }),
  };
  store.jobs[idx] = merged;
  await writeFileStore(store);
  return merged;
}

export async function upsertJobRecord(userId: string, job: JobCard): Promise<StoredJob> {
  const entry: StoredJob = { ...job, ...resolvePriorityFields(job), userId };

  if (useKvStore()) {
    const existing = (await kv.get<StoredJob[]>(kvKey(userId))) ?? [];
    const idx = existing.findIndex((j) => j.id === job.id);
    const next =
      idx >= 0
        ? existing.map((j, i) => (i === idx ? entry : j))
        : [entry, ...existing];
    await kv.set(kvKey(userId), next.slice(0, 200));
    return entry;
  }

  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }

  const store = await readFileStore();
  const idx = store.jobs.findIndex((j) => j.id === job.id && j.userId === userId);
  if (idx >= 0) {
    store.jobs[idx] = entry;
  } else {
    store.jobs.unshift(entry);
  }
  await writeFileStore({ jobs: store.jobs.slice(0, 500) });
  return entry;
}
