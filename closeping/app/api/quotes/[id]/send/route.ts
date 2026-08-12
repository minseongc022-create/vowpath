import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getQuote, updateQuote } from "@/lib/db";
import { sendQuoteSms } from "@/lib/sms";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const quote = await getQuote(session.sub, id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!quote.customerPhone) {
    return NextResponse.json({ error: "Phone required" }, { status: 400 });
  }

  const sent = await sendQuoteSms({
    shopName: session.shopName,
    phone: quote.customerPhone,
    customerName: quote.customerName,
    amountCents: quote.amountCents,
  });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.reason ?? "SMS failed" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = await updateQuote(session.sub, id, {
    status: "sent",
    sentAt: now,
    chaseSentAt: [],
    consentAt: now,
  });
  return NextResponse.json({ ok: true, quote: updated, smsPreview: sent.body });
}
