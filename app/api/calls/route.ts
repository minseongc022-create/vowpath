import { NextResponse } from "next/server";
import { listCallLogs } from "@/lib/call-logs";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start")?.trim() || undefined;
  const end = url.searchParams.get("end")?.trim() || undefined;

  const calls = await listCallLogs(session.sub, { start, end });
  return NextResponse.json({ calls });
}
