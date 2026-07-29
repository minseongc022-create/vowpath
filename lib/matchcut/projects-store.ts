import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import { kvGetSafe } from "../kv-safe";
import type { GeneratedAngle, MatchCandidate, MatchResult, ScrapedListing } from "../sourcing-detail/types";

const KV_PREFIX = "matchcut:projects:";

export type MatchCutProject = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  sourceUrl: string;
  platform?: string;
  status: "matched" | "generated" | "exported";
  listing?: ScrapedListing;
  match?: MatchResult;
  selectedCandidate?: MatchCandidate | null;
  generatedAngles?: GeneratedAngle[];
  detailPageHtml?: string;
  creditsUsed: number;
};

type FileStore = Record<string, MatchCutProject[]>;

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "matchcut-projects.json");

async function readFileStore(): Promise<FileStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(PROJECTS_FILE, "utf-8")) as FileStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: FileStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PROJECTS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function loadProjects(userId: string): Promise<MatchCutProject[]> {
  if (useKvStore()) {
    return (await kvGetSafe<MatchCutProject[]>(`${KV_PREFIX}${userId}`)) ?? [];
  }
  const store = await readFileStore();
  return store[userId] ?? [];
}

async function saveProjects(userId: string, projects: MatchCutProject[]) {
  if (useKvStore()) {
    await kv.set(`${KV_PREFIX}${userId}`, projects);
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store[userId] = projects;
  await writeFileStore(store);
}

export async function listProjects(userId: string): Promise<MatchCutProject[]> {
  const projects = await loadProjects(userId);
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(
  userId: string,
  projectId: string,
): Promise<MatchCutProject | null> {
  const projects = await loadProjects(userId);
  return projects.find((p) => p.id === projectId) ?? null;
}

export async function createProject(input: {
  userId: string;
  title: string;
  sourceUrl: string;
  platform?: string;
  listing?: ScrapedListing;
  match?: MatchResult;
  selectedCandidate?: MatchCandidate | null;
  creditsUsed?: number;
}): Promise<MatchCutProject> {
  const now = new Date().toISOString();
  const project: MatchCutProject = {
    id: randomUUID(),
    userId: input.userId,
    createdAt: now,
    updatedAt: now,
    title: input.title || "무제 프로젝트",
    sourceUrl: input.sourceUrl,
    platform: input.platform,
    status: "matched",
    listing: input.listing,
    match: input.match,
    selectedCandidate: input.selectedCandidate,
    creditsUsed: input.creditsUsed ?? 0,
  };
  const projects = await loadProjects(input.userId);
  projects.unshift(project);
  await saveProjects(input.userId, projects.slice(0, 100));
  return project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  patch: Partial<
    Pick<
      MatchCutProject,
      | "title"
      | "status"
      | "selectedCandidate"
      | "generatedAngles"
      | "detailPageHtml"
      | "creditsUsed"
      | "match"
      | "listing"
    >
  >,
): Promise<MatchCutProject | null> {
  const projects = await loadProjects(userId);
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return null;
  projects[idx] = {
    ...projects[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveProjects(userId, projects);
  return projects[idx];
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const projects = await loadProjects(userId);
  const next = projects.filter((p) => p.id !== projectId);
  if (next.length === projects.length) return false;
  await saveProjects(userId, next);
  return true;
}
