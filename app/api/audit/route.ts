import { NextResponse } from "next/server";
import { AUDIT_EVENT_TYPES, listTenantEvents } from "@/lib/tenant-events";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? "30")));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const events = await listTenantEvents(session.sub, {
    since,
    limit: 300,
    types: AUDIT_EVENT_TYPES,
  });

  return NextResponse.json({ events });
}
