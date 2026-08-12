import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const session = await getLearnSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    completed?: boolean;
    description?: string;
    dueDate?: string | null;
  };

  const existing = await prisma.plannerItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.plannerItem.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.completed !== undefined ? { completed: body.completed } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.dueDate !== undefined
        ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
        : {}),
    },
  });

  return NextResponse.json({
    id: item.id,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate?.toISOString() ?? null,
    completed: item.completed,
    priority: item.priority,
    updatedAt: item.updatedAt.toISOString(),
  });
}
