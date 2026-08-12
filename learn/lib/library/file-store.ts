import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CreateMaterialInput,
  MaterialRecord,
  MaterialStatus,
} from "@/learn/types/material";

const DATA_DIR = join(process.cwd(), ".data", "learn-library");

type StoreFile = {
  materials: MaterialRecord[];
};

async function loadStore(userId: string): Promise<StoreFile> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(join(DATA_DIR, `${userId}.json`), "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return { materials: [] };
  }
}

async function saveStore(userId: string, store: StoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, `${userId}.json`), JSON.stringify(store, null, 2));
}

export async function fileStoreList(userId: string): Promise<MaterialRecord[]> {
  const store = await loadStore(userId);
  return store.materials.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function fileStoreGet(
  userId: string,
  id: string,
): Promise<MaterialRecord | null> {
  const store = await loadStore(userId);
  return store.materials.find((m) => m.id === id) ?? null;
}

export async function fileStoreCreate(
  userId: string,
  input: CreateMaterialInput,
): Promise<MaterialRecord> {
  const store = await loadStore(userId);
  const now = new Date().toISOString();
  const material: MaterialRecord = {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    status: "PENDING",
    title: input.title || defaultTitle(input),
    sourceUrl: input.sourceUrl ?? null,
    sourceLabel: input.sourceLabel ?? null,
    linkedCourse: input.linkedCourse ?? null,
    linkedLesson: input.linkedLesson ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  store.materials.unshift(material);
  await saveStore(userId, store);
  return material;
}

export async function fileStoreUpdate(
  userId: string,
  id: string,
  patch: Partial<MaterialRecord>,
): Promise<MaterialRecord | null> {
  const store = await loadStore(userId);
  const idx = store.materials.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  store.materials[idx] = {
    ...store.materials[idx]!,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveStore(userId, store);
  return store.materials[idx]!;
}

export async function fileStoreSetStatus(
  userId: string,
  id: string,
  status: MaterialStatus,
  extra?: Partial<MaterialRecord>,
): Promise<void> {
  await fileStoreUpdate(userId, id, { status, ...extra });
}

function defaultTitle(input: CreateMaterialInput): string {
  if (input.type === "YOUTUBE") return "YouTube 강의";
  if (input.type === "PDF") return "PDF 자료";
  if (input.type === "NOTE") return "내 필기";
  return "학습 자료";
}

export async function fileStoreSearch(
  userId: string,
  query: string,
): Promise<MaterialRecord[]> {
  const q = query.toLowerCase();
  const all = await fileStoreList(userId);
  return all.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.fullTranscript?.toLowerCase().includes(q) ||
      m.analysis?.summary.toLowerCase().includes(q) ||
      m.analysis?.sections?.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.points.some((p) => p.toLowerCase().includes(q)),
      ) ||
      m.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

export async function fileStoreForLesson(
  userId: string,
  courseSlug: string,
  lessonSlug: string,
): Promise<MaterialRecord[]> {
  const all = await fileStoreList(userId);
  return all.filter(
    (m) => m.linkedCourse === courseSlug && m.linkedLesson === lessonSlug,
  );
}

export async function fileStoreLinkLesson(
  userId: string,
  materialId: string,
  courseSlug: string,
  lessonSlug: string,
): Promise<MaterialRecord | null> {
  return fileStoreUpdate(userId, materialId, {
    linkedCourse: courseSlug,
    linkedLesson: lessonSlug,
  });
}
