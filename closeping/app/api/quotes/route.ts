import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createQuote, listQuotes } from "@/lib/db";
import { computeStats, normalizePhone } from "@/lib/quotes";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotes = await listQuotes(session.sub);
  return NextResponse.json({ ok: true, quotes, stats: computeStats(quotes) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const amountCents = Math.round(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const quote = await createQuote(session.sub, {
      customerName: String(body.customerName ?? "").trim().slice(0, 80) || "Customer",
      customerPhone: normalizePhone(String(body.customerPhone ?? "")),
      description: String(body.description ?? "").trim().slice(0, 500) || "Estimate",
      amountCents,
      address: body.address ? String(body.address).slice(0, 200) : undefined,
      trade: body.trade ? String(body.trade).slice(0, 80) : undefined,
    });
    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
