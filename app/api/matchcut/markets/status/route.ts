import { NextResponse } from "next/server";
import { getMarketConnectionStatuses } from "@/lib/matchcut/markets";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export async function GET() {
  try {
    await requireMatchCutSession();
    return NextResponse.json({ ok: true, markets: getMarketConnectionStatuses() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
