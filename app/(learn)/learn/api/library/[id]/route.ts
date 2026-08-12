import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import {
  runMaterialIngestion,
  appendMaterialText,
} from "@/learn/lib/ingest/pipeline";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { id } = await params;
    const material = await getMaterial(userId, id);
    if (!material) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(material);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { id } = await params;
    const body = (await request.json()) as {
      action?: "reingest" | "append";
      text?: string;
      pastedTranscript?: string;
    };

    const material = await getMaterial(userId, id);
    if (!material) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.action === "append" && body.text?.trim()) {
      await appendMaterialText(userId, id, body.text);
      const updated = await getMaterial(userId, id);
      return NextResponse.json(updated);
    }

    if (material.type === "YOUTUBE" && material.sourceUrl) {
      void runMaterialIngestion(userId, id, {
        type: "YOUTUBE",
        url: material.sourceUrl,
        pastedTranscript: body.pastedTranscript,
      }).catch(() => undefined);
    } else if (material.fullTranscript) {
      void runMaterialIngestion(userId, id).catch(() => undefined);
    }

    return NextResponse.json({ status: "EXTRACTING", id });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { id } = await params;

    const { isDatabaseConfigured } = await import("@/learn/lib/db");
    if (isDatabaseConfigured()) {
      const { prisma } = await import("@/learn/lib/db");
      await prisma.learningMaterial.deleteMany({ where: { id, userId } });
    } else {
      const fs = await import("@/learn/lib/library/file-store");
      await fs.fileStoreUpdate(userId, id, { status: "FAILED", title: "[deleted]" });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
