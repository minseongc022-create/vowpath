import { NextResponse } from "next/server";
import { listCallLogs } from "@/lib/call-logs";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const calls = await listCallLogs(session.sub);
  return NextResponse.json({ calls });
}
