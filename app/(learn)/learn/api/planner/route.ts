import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";

export async function GET() {
  const session = await getLearnSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }

  const items = await prisma.plannerItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      dueDate: item.dueDate?.toISOString() ?? null,
      completed: item.completed,
      priority: item.priority,
      updatedAt: item.updatedAt.toISOString(),
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
    description?: string;
    dueDate?: string;
  };

  const item = await prisma.plannerItem.create({
    data: {
      userId: session.user.id,
      title: body.title ?? "새 목표",
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
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
