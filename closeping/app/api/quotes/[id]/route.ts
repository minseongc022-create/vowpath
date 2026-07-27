import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getQuote, updateQuote } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const quote = await getQuote(session.sub, id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, quote });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json();

  if (body.status === "won" || body.status === "lost") {
    const quote = await updateQuote(session.sub, id, { status: body.status });
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, quote });
  }

  const patch: Record<string, unknown> = {};
  if (body.customerName != null) patch.customerName = String(body.customerName).slice(0, 80);
  if (body.description != null) patch.description = String(body.description).slice(0, 500);
  if (body.amountCents != null) {
    const c = Math.round(Number(body.amountCents));
    if (Number.isFinite(c) && c > 0) patch.amountCents = c;
  }
  const quote = await updateQuote(session.sub, id, patch);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, quote });
}
