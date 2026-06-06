import { NextResponse } from "next/server";
import {
  dismissAllNotifications,
  dismissNotifications,
  getDismissedNotificationIds,
} from "@/lib/notification-dismissed";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dismissedIds = await getDismissedNotificationIds(session.sub);
    return NextResponse.json({ dismissedIds });
  } catch (e) {
    console.error("[notifications/dismiss GET]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json({ dismissedIds: [] }, { status: 503 });
    }
    return NextResponse.json({ dismissedIds: [] }, { status: 500 });
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
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id: unknown) => String(id))
      : [];

    const dismissedIds =
      allIds.length > 0
        ? await dismissAllNotifications(session.sub, allIds)
        : await dismissNotifications(session.sub, ids);

    return NextResponse.json({ ok: true, dismissedIds });
  } catch (e) {
    console.error("[notifications/dismiss POST]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Server storage not configured. Connect Vercel KV." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to dismiss notifications" }, { status: 500 });
  }
}
