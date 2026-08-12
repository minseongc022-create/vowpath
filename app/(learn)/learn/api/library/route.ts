import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import {
  createMaterial,
  listMaterials,
  resolveUserId,
  searchMaterials,
} from "@/learn/lib/library/repository";
import { runMaterialIngestion } from "@/learn/lib/ingest/pipeline";
import type { CreateMaterialInput, MaterialType } from "@/learn/types/material";
import { extractYouTubeVideoId } from "@/learn/lib/ingest/youtube";
import { isPdfFile } from "@/learn/lib/ingest/pdf";

export async function GET(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    const materials = q
      ? await searchMaterials(userId, q)
      : await listMaterials(userId);

    return NextResponse.json(materials);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list materials" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return handleMultipart(request, userId);
    }

    const body = (await request.json()) as CreateMaterialInput & {
      text?: string;
      pastedTranscript?: string;
      async?: boolean;
    };

    const material = await createMaterial(userId, body);

    const ingestSource = buildIngestSource(body);
    if (ingestSource) {
      if (body.async !== false) {
        void runMaterialIngestion(userId, material.id, ingestSource).catch(() => undefined);
        return NextResponse.json({ ...material, status: "EXTRACTING" }, { status: 202 });
      }
      await runMaterialIngestion(userId, material.id, ingestSource);
      const { getMaterial } = await import("@/learn/lib/library/repository");
      const done = await getMaterial(userId, material.id);
      return NextResponse.json(done);
    }

    return NextResponse.json(material, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : "CREATE_FAILED";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

async function handleMultipart(request: Request, userId: string) {
  const form = await request.formData();
  const file = form.get("file");
  const type = (form.get("type") as MaterialType) || "PDF";
  const title = (form.get("title") as string) || undefined;
  const sourceLabel = (form.get("sourceLabel") as string) || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (type === "PDF" || isPdfFile(file.name, file.type)) {
    const material = await createMaterial(userId, {
      type: "PDF",
      title: title ?? file.name.replace(/\.pdf$/i, ""),
      sourceLabel,
    });

    void runMaterialIngestion(userId, material.id, {
      type: "PDF",
      buffer,
      fileName: file.name,
    }).catch(() => undefined);

    return NextResponse.json({ ...material, status: "EXTRACTING" }, { status: 202 });
  }

  const text = buffer.toString("utf8");
  const material = await createMaterial(userId, {
    type: "TEXT",
    title: title ?? file.name,
    sourceLabel,
    text,
  });

  void runMaterialIngestion(userId, material.id, {
    type: "TEXT",
    text,
    title: material.title,
  }).catch(() => undefined);

  return NextResponse.json({ ...material, status: "EXTRACTING" }, { status: 202 });
}

function buildIngestSource(
  body: CreateMaterialInput & { text?: string; pastedTranscript?: string },
) {
  if (body.type === "YOUTUBE" && body.sourceUrl) {
    if (!extractYouTubeVideoId(body.sourceUrl)) {
      throw new Error("INVALID_YOUTUBE_URL");
    }
    return {
      type: "YOUTUBE" as const,
      url: body.sourceUrl,
      pastedTranscript: body.pastedTranscript,
    };
  }
  if ((body.type === "TEXT" || body.type === "NOTE") && body.text?.trim()) {
    return {
      type: body.type,
      text: body.text,
      title: body.title,
      sourceLabel: body.sourceLabel,
    };
  }
  return null;
}
