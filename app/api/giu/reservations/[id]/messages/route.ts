import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import {
  addReservationChatMessage,
  countUnreadChatMessages,
  getReservation,
  listReservationChatMessages,
  markReservationChatRead,
} from "@/giu/lib/store";

const postSchema = z.object({
  body: z.string().min(1).max(500),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const session = await getGiuSessionFromRequest(request);
  const allowed =
    (session?.role === "customer" && session.sub === reservation.customerId) ||
    (session?.role === "merchant" && session.merchantId === reservation.merchantId);

  if (!allowed || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("markRead") === "1") {
    await markReservationChatRead(id, session.role);
  }

  const messages = await listReservationChatMessages(id);
  const unreadCount = await countUnreadChatMessages(id, session.role);
  return NextResponse.json({ messages, unreadCount });
}

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const reservation = await getReservation(id);
    if (!reservation) {
      return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    }

    const session = await getGiuSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed =
      (session.role === "customer" && session.sub === reservation.customerId) ||
      (session.role === "merchant" && session.merchantId === reservation.merchantId);

    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const senderId = session.role === "customer" ? session.sub : session.sub;
    const result = await addReservationChatMessage({
      reservationId: id,
      senderRole: session.role,
      senderId,
      body: parsed.data.body,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
