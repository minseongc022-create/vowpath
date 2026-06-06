import { NextResponse } from "next/server";
import {
  getReadNotificationIds,
  markAllNotificationsRead,
  markNotificationsRead,
} from "@/lib/notification-read";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const readIds = await getReadNotificationIds(session.sub);
    return NextResponse.json({ readIds });
  } catch (e) {
    console.error("[notifications/read GET]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json({ readIds: [] }, { status: 503 });
    }
    return NextResponse.json({ readIds: [] }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id: unknown) => String(id))
      : body?.id
        ? [String(body.id)]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No notification ids provided" }, { status: 400 });
    }

    const readIds = await markNotificationsRead(session.sub, ids);
    return NextResponse.json({ ok: true, readIds });
  } catch (e) {
    console.error("[notifications/read PATCH]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Server storage not configured. Connect Vercel KV." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to update read state" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const allIds = Array.isArray(body?.allIds)
      ? body.allIds.map((id: unknown) => String(id))
      : [];

    const readIds = await markAllNotificationsRead(session.sub, allIds);
    return NextResponse.json({ ok: true, readIds });
  } catch (e) {
    console.error("[notifications/read POST]", e);
    return NextResponse.json({ error: "Failed to mark all read" }, { status: 500 });
  }
}
