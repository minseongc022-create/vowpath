import { prisma, isDatabaseConfigured } from "@/learn/lib/db";
import type {
  CreateMaterialInput,
  MaterialAnalysisRecord,
  MaterialRecord,
  MaterialStatus,
  MaterialType,
} from "@/learn/types/material";
import * as fileStore from "@/learn/lib/library/file-store";

export const DEMO_USER_ID = "demo-user";

export function resolveUserId(sessionUserId?: string | null): string {
  if (sessionUserId) return sessionUserId;
  if (process.env.NEXT_PUBLIC_AUTH_DEMO === "true") return DEMO_USER_ID;
  throw new Error("UNAUTHORIZED");
}

export async function listMaterials(userId: string): Promise<MaterialRecord[]> {
  if (!isDatabaseConfigured()) {
    return fileStore.fileStoreList(userId);
  }

  const rows = await prisma.learningMaterial.findMany({
    where: { userId },
    include: { analysis: true, chunks: { orderBy: { chunkIndex: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map(mapPrismaMaterial);
}

export async function getMaterial(
  userId: string,
  id: string,
): Promise<MaterialRecord | null> {
  if (!isDatabaseConfigured()) {
    return fileStore.fileStoreGet(userId, id);
  }

  const row = await prisma.learningMaterial.findFirst({
    where: { id, userId },
    include: { analysis: true, chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  return row ? mapPrismaMaterial(row) : null;
}

export async function createMaterial(
  userId: string,
  input: CreateMaterialInput,
): Promise<MaterialRecord> {
  if (!isDatabaseConfigured()) {
    return fileStore.fileStoreCreate(userId, input);
  }

  const row = await prisma.learningMaterial.create({
    data: {
      userId,
      type: input.type as MaterialType,
      title: input.title || defaultTitle(input),
      sourceUrl: input.sourceUrl,
      sourceLabel: input.sourceLabel,
      rawText: input.text,
      tags: input.tags ?? [],
      status: "PENDING",
    },
    include: { analysis: true, chunks: true },
  });

  return mapPrismaMaterial(row);
}

export async function updateMaterial(
  userId: string,
  id: string,
  patch: {
    status?: MaterialStatus;
    title?: string;
    rawText?: string;
    fullTranscript?: string;
    searchableText?: string;
    errorMessage?: string | null;
    analysis?: MaterialAnalysisRecord;
    chunks?: MaterialRecord["chunks"];
  },
): Promise<MaterialRecord | null> {
  if (!isDatabaseConfigured()) {
    return fileStore.fileStoreUpdate(userId, id, patch);
  }

  const { analysis, chunks, ...data } = patch;

  await prisma.learningMaterial.updateMany({
    where: { id, userId },
    data: {
      ...data,
      ...(analysis
        ? {}
        : {}),
    },
  });

  if (analysis) {
    await prisma.materialAnalysis.upsert({
      where: { materialId: id },
      create: {
        materialId: id,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        keywords: analysis.keywords,
        mindmapTree: analysis.mindmapTree,
        analyzedAt: new Date(analysis.analyzedAt),
      },
      update: {
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        keywords: analysis.keywords,
        mindmapTree: analysis.mindmapTree,
        analyzedAt: new Date(analysis.analyzedAt),
      },
    });
  }

  if (chunks) {
    await prisma.materialChunk.deleteMany({ where: { materialId: id } });
    await prisma.materialChunk.createMany({
      data: chunks.map((c) => ({
        materialId: id,
        chunkIndex: c.chunkIndex,
        startSec: c.startSec,
        endSec: c.endSec,
        rawContent: c.rawContent,
        cleanedContent: c.cleanedContent,
        status: c.status,
      })),
    });
  }

  return getMaterial(userId, id);
}

export async function searchMaterials(
  userId: string,
  query: string,
): Promise<MaterialRecord[]> {
  if (!isDatabaseConfigured()) {
    return fileStore.fileStoreSearch(userId, query);
  }

  const q = query.trim();
  if (!q) return listMaterials(userId);

  const rows = await prisma.learningMaterial.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { searchableText: { contains: q, mode: "insensitive" } },
        { fullTranscript: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { analysis: true, chunks: { orderBy: { chunkIndex: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return rows.map(mapPrismaMaterial);
}

function defaultTitle(input: CreateMaterialInput): string {
  if (input.type === "YOUTUBE") return "YouTube 강의";
  if (input.type === "PDF") return "PDF 자료";
  if (input.type === "NOTE") return "내 필기";
  return "학습 자료";
}

type PrismaMaterial = Awaited<
  ReturnType<typeof prisma.learningMaterial.findFirst>
> & {
  analysis?: {
    summary: string;
    keyPoints: unknown;
    keywords: unknown;
    mindmapTree: unknown;
    analyzedAt: Date;
  } | null;
  chunks?: {
    id: string;
    chunkIndex: number;
    startSec: number | null;
    endSec: number | null;
    rawContent: string;
    cleanedContent: string | null;
    status: string;
  }[];
};

function mapPrismaMaterial(row: NonNullable<PrismaMaterial>): MaterialRecord {
  const chunks = row.chunks ?? [];
  const completed = chunks.filter((c) => c.status === "done").length;

  return {
    id: row!.id,
    type: row!.type as MaterialType,
    status: row!.status as MaterialStatus,
    title: row!.title,
    sourceUrl: row!.sourceUrl,
    sourceLabel: row!.sourceLabel,
    fullTranscript: row!.fullTranscript,
    errorMessage: row!.errorMessage,
    tags: row!.tags ?? [],
    createdAt: row!.createdAt.toISOString(),
    updatedAt: row!.updatedAt.toISOString(),
    chunks: chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      startSec: c.startSec,
      endSec: c.endSec,
      rawContent: c.rawContent,
      cleanedContent: c.cleanedContent,
      status: c.status,
    })),
    analysis: row.analysis
      ? {
          summary: row.analysis.summary,
          keyPoints: row.analysis.keyPoints as string[],
          keywords: row.analysis.keywords as string[],
          mindmapTree: row.analysis.mindmapTree as MaterialAnalysisRecord["mindmapTree"],
          analyzedAt: row.analysis.analyzedAt.toISOString(),
        }
      : null,
    progress: chunks.length
      ? {
          totalChunks: chunks.length,
          completedChunks: completed,
          phase: row!.status as MaterialStatus,
        }
      : undefined,
  };
}
