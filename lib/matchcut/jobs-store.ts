import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import { kvGetSafe } from "../kv-safe";
import type { ListingThumbnail } from "../sourcing-detail/thumbnail-generate";
import type {
  DetailPageBundle,
  GeneratedAngle,
  MatchCandidate,
  MatchResult,
  ScrapedListing,
} from "../sourcing-detail/types";

const KV_PREFIX = "matchcut:jobs:";
const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "matchcut-jobs.json");

export type GenerateJobStatus = "queued" | "running" | "done" | "failed";

export type GenerateJob = {
  id: string;
  userId: string;
  projectId: string | null;
  status: GenerateJobStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  creditsDebited?: number;
  creditsRefunded?: number;
  packCredits: number;
  maxAngles: number;
  /** Large payload kept until job completes */
  input?: {
    listing: ScrapedListing;
    match: MatchResult;
    selectedCandidate: MatchCandidate;
    referenceImageBase64: string;
    referenceMime?: string;
    withThumbnails: boolean;
  };
  result?: {
    generatedAngles: GeneratedAngle[];
    thumbnails?: ListingThumbnail[];
    detailPageHtml: string;
    detailBundle?: DetailPageBundle;
    successCount: number;
    thumbnailSuccessCount: number;
    needsFixCount: number;
  };
};

type FileStore = Record<string, GenerateJob>;

async function readFileStore(): Promise<FileStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(JOBS_FILE, "utf-8")) as FileStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: FileStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(JOBS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function saveJob(job: GenerateJob) {
  job.updatedAt = new Date().toISOString();
  if (useKvStore()) {
    await kv.set(`${KV_PREFIX}${job.id}`, job);
    // index by user for listing active jobs
    const key = `${KV_PREFIX}user:${job.userId}`;
    const ids = (await kvGetSafe<string[]>(key)) ?? [];
    if (!ids.includes(job.id)) {
      await kv.set(key, [job.id, ...ids].slice(0, 50));
    }
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store[job.id] = job;
  // prune old finished jobs (>48h)
  const cutoff = Date.now() - 48 * 3600_000;
  for (const [id, j] of Object.entries(store)) {
    if (
      (j.status === "done" || j.status === "failed") &&
      new Date(j.updatedAt).getTime() < cutoff
    ) {
      delete store[id];
    }
  }
  await writeFileStore(store);
}

export async function createGenerateJob(input: {
  userId: string;
  projectId: string | null;
  packCredits: number;
  maxAngles: number;
  payload: NonNullable<GenerateJob["input"]>;
}): Promise<GenerateJob> {
  const now = new Date().toISOString();
  const job: GenerateJob = {
    id: randomUUID(),
    userId: input.userId,
    projectId: input.projectId,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    packCredits: input.packCredits,
    maxAngles: input.maxAngles,
    input: input.payload,
  };
  await saveJob(job);
  return job;
}

export async function getGenerateJob(
  jobId: string,
  userId?: string,
): Promise<GenerateJob | null> {
  let job: GenerateJob | null = null;
  if (useKvStore()) {
    job = (await kvGetSafe<GenerateJob>(`${KV_PREFIX}${jobId}`)) ?? null;
  } else {
    const store = await readFileStore();
    job = store[jobId] ?? null;
  }
  if (!job) return null;
  if (userId && job.userId !== userId) return null;
  return job;
}

export async function updateGenerateJob(
  jobId: string,
  patch: Partial<GenerateJob>,
): Promise<GenerateJob | null> {
  const existing = await getGenerateJob(jobId);
  if (!existing) return null;
  const next = { ...existing, ...patch, id: existing.id, userId: existing.userId };
  // Drop heavy input once finished to keep file small
  if (next.status === "done" || next.status === "failed") {
    delete next.input;
  }
  await saveJob(next);
  return next;
}

export async function listActiveGenerateJobs(userId: string): Promise<GenerateJob[]> {
  if (useKvStore()) {
    const ids = (await kvGetSafe<string[]>(`${KV_PREFIX}user:${userId}`)) ?? [];
    const jobs: GenerateJob[] = [];
    for (const id of ids.slice(0, 20)) {
      const j = await getGenerateJob(id, userId);
      if (j && (j.status === "queued" || j.status === "running")) jobs.push(j);
    }
    return jobs;
  }
  const store = await readFileStore();
  return Object.values(store)
    .filter((j) => j.userId === userId && (j.status === "queued" || j.status === "running"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Public-safe job view (no reference image bytes). */
export function publicGenerateJob(job: GenerateJob) {
  return {
    id: job.id,
    projectId: job.projectId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error,
    creditsDebited: job.creditsDebited,
    creditsRefunded: job.creditsRefunded,
    maxAngles: job.maxAngles,
    result: job.result,
  };
}
