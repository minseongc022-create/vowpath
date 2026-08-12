import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";

export async function GET(request: Request) {
  const session = await getLearnSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId");

  const notes = await prisma.note.findMany({
    where: {
      userId: session.user.id,
      ...(lessonId ? { lessonId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      lessonId: n.lessonId,
      updatedAt: n.updatedAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const session = await getLearnSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    title?: string;
    content?: string;
    lessonId?: string;
  };

  const note = await prisma.note.create({
    data: {
      userId: session.user.id,
      title: body.title ?? "새 필기",
      content: body.content ?? "",
      lessonId: body.lessonId ?? null,
    },
  });

  return NextResponse.json({
    id: note.id,
    title: note.title,
    content: note.content,
    lessonId: note.lessonId,
    updatedAt: note.updatedAt.toISOString(),
  });
}

export async function PATCH(request: Request) {
  const session = await getLearnSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    content?: string;
    lessonId?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.note.findFirst({
    where: { id: body.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await prisma.note.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.lessonId !== undefined ? { lessonId: body.lessonId } : {}),
    },
  });

  return NextResponse.json({
    id: note.id,
    title: note.title,
    content: note.content,
    lessonId: note.lessonId,
    updatedAt: note.updatedAt.toISOString(),
  });
}
