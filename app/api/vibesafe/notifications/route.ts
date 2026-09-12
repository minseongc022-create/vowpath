import { z } from "zod";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { prisma } from "@/vibesafe/lib/db";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const rows = await prisma.vibesafeNotification.findMany({
    where: { userId: auth.session.userId, channel: "inapp" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, kind: true, title: true, body: true, readAt: true,
      createdAt: true, projectId: true, incidentId: true,
    },
  });
  const unread = rows.filter((r) => !r.readAt).length;
  return ok({ notifications: rows, unread });
}

const schema = z.object({ ids: z.array(z.string().max(60)).max(50).optional() });

/** 읽음 처리. ids가 없으면 전부 읽음. */
export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  const result = await prisma.vibesafeNotification.updateMany({
    where: {
      userId: auth.session.userId,
      channel: "inapp",
      readAt: null,
      ...(parsed.data.ids?.length ? { id: { in: parsed.data.ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  if (result.count > 0) {
    await recordEvent({
      name: "notification_opened",
      userId: auth.session.userId,
      props: { count: result.count },
    });
  }
  return ok({ updated: result.count });
}

export const dynamic = "force-dynamic";
