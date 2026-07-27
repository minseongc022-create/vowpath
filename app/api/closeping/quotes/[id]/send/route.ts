import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { sendClosePingQuote } from "@/lib/closeping/quotes-service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const { job } = await sendClosePingQuote(session.sub, id);
    const { userId: _u, ...quote } = job;
    return NextResponse.json({ ok: true, quote, sent: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status =
      msg === "NOT_FOUND" ? 404 : msg === "NO_PHONE" || msg === "NO_AMOUNT" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
