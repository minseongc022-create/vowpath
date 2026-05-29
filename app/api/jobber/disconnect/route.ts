import { NextResponse } from "next/server";
import { deleteJobberTokens } from "@/lib/jobber-tokens";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteJobberTokens(session.sub);
  return NextResponse.json({ ok: true });
}
