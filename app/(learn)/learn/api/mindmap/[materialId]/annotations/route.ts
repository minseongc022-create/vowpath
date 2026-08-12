import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { resolveUserId } from "@/learn/lib/library/repository";
import {
  listAnnotations,
  upsertAnnotation,
  deleteAnnotation,
} from "@/learn/lib/mindmap/annotation-store";

type Props = { params: Promise<{ materialId: string }> };

export async function GET(_req: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;
    const items = await listAnnotations(userId, materialId);
    return NextResponse.json(items);
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
    const { materialId } = await params;
    const body = (await request.json()) as {
      x?: number;
      y?: number;
      content?: string;
      color?: string;
      linkedNodeId?: string;
    };

    const item = await upsertAnnotation(userId, materialId, {
      x: body.x ?? 0,
      y: body.y ?? 0,
      content: body.content ?? "",
      color: body.color,
      linkedNodeId: body.linkedNodeId,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;
    const body = (await request.json()) as {
      id: string;
      x?: number;
      y?: number;
      content?: string;
      color?: string;
    };

    const item = await upsertAnnotation(userId, materialId, {
      id: body.id,
      x: body.x ?? 0,
      y: body.y ?? 0,
      content: body.content ?? "",
      color: body.color,
    });

    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await deleteAnnotation(userId, materialId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
