import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";
import type { MindmapAnnotation } from "@/learn/types/material";

const DATA_DIR = join(process.cwd(), ".data", "learn-mindmap");

async function loadFile(userId: string, materialId: string): Promise<MindmapAnnotation[]> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(join(DATA_DIR, `${userId}-${materialId}.json`), "utf8");
    return JSON.parse(raw) as MindmapAnnotation[];
  } catch {
    return [];
  }
}

async function saveFile(
  userId: string,
  materialId: string,
  items: MindmapAnnotation[],
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    join(DATA_DIR, `${userId}-${materialId}.json`),
    JSON.stringify(items, null, 2),
  );
}

export async function listAnnotations(
  userId: string,
  materialId: string,
): Promise<MindmapAnnotation[]> {
  if (!isDatabaseConfigured()) {
    return loadFile(userId, materialId);
  }

  const rows = await prisma.mindmapAnnotation.findMany({
    where: { userId, materialId },
    orderBy: { updatedAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    materialId: r.materialId,
    userId: r.userId,
    linkedNodeId: r.linkedNodeId,
    x: r.x,
    y: r.y,
    content: r.content,
    color: r.color,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function upsertAnnotation(
  userId: string,
  materialId: string,
  input: {
    id?: string;
    x: number;
    y: number;
    content: string;
    color?: string;
    linkedNodeId?: string | null;
  },
): Promise<MindmapAnnotation> {
  const now = new Date().toISOString();

  if (!isDatabaseConfigured()) {
    const items = await loadFile(userId, materialId);
    if (input.id) {
      const idx = items.findIndex((a) => a.id === input.id);
      if (idx >= 0) {
        items[idx] = { ...items[idx]!, ...input, updatedAt: now };
        await saveFile(userId, materialId, items);
        return items[idx]!;
      }
    }
    const created: MindmapAnnotation = {
      id: input.id ?? `ann-${Date.now()}`,
      materialId,
      userId,
      linkedNodeId: input.linkedNodeId ?? null,
      x: input.x,
      y: input.y,
      content: input.content,
      color: input.color ?? "#FEF3C7",
      createdAt: now,
      updatedAt: now,
    };
    items.push(created);
    await saveFile(userId, materialId, items);
    return created;
  }

  if (input.id) {
    const row = await prisma.mindmapAnnotation.update({
      where: { id: input.id },
      data: {
        x: input.x,
        y: input.y,
        content: input.content,
        color: input.color,
        linkedNodeId: input.linkedNodeId,
      },
    });
    return mapRow(row);
  }

  const row = await prisma.mindmapAnnotation.create({
    data: {
      userId,
      materialId,
      x: input.x,
      y: input.y,
      content: input.content,
      color: input.color ?? "#FEF3C7",
      linkedNodeId: input.linkedNodeId,
    },
  });
  return mapRow(row);
}

export async function deleteAnnotation(
  userId: string,
  materialId: string,
  id: string,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    const items = (await loadFile(userId, materialId)).filter((a) => a.id !== id);
    await saveFile(userId, materialId, items);
    return;
  }
  await prisma.mindmapAnnotation.deleteMany({ where: { id, userId, materialId } });
}

function mapRow(r: {
  id: string;
  materialId: string;
  userId: string;
  linkedNodeId: string | null;
  x: number;
  y: number;
  content: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}): MindmapAnnotation {
  return {
    id: r.id,
    materialId: r.materialId,
    userId: r.userId,
    linkedNodeId: r.linkedNodeId,
    x: r.x,
    y: r.y,
    content: r.content,
    color: r.color,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
