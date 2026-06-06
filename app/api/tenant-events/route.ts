import { NextResponse } from "next/server";
import { listTenantEvents, NOTIFICATION_EVENT_TYPES } from "@/lib/tenant-events";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? "14")));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  try {
    const events = await listTenantEvents(session.sub, {
      since,
      limit: 200,
      types: NOTIFICATION_EVENT_TYPES,
    });
    return NextResponse.json({ events });
  } catch (e) {
    console.error("[tenant-events GET]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Storage not configured", events: [] },
        { status: 503 },
      );
    }
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
