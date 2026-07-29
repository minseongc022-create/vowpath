import { NextResponse } from "next/server";
import { getCreditBalance } from "@/lib/matchcut/credits-store";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export async function GET() {
  try {
    const session = await requireMatchCutSession();
    const credits = await getCreditBalance(session.sub);
    return NextResponse.json({ ok: true, credits });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
