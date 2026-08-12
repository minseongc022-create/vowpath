import { NextResponse } from "next/server";
import { listAllQuotes, updateQuote } from "@/lib/db";
import { findUserById } from "@/lib/db";
import { isChaseDue, nextChaseIndex } from "@/lib/quotes";
import { sendChaseSms } from "@/lib/sms";

/** Daily chase runner — call with Authorization: Bearer $CLOSEPING_CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CLOSEPING_CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (bearer !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const quotes = await listAllQuotes();
  let sent = 0;
  let checked = 0;

  for (const q of quotes) {
    if (!isChaseDue(q)) continue;
    checked += 1;
    const idx = nextChaseIndex(q);
    if (idx == null) continue;
    const user = await findUserById(q.userId);
    await sendChaseSms({
      shopName: user?.shopName ?? "Shop",
      phone: q.customerPhone,
      amountCents: q.amountCents,
      stage: idx,
    });
    const now = new Date().toISOString();
    await updateQuote(q.userId, q.id, {
      status: "chasing",
      chaseSentAt: [...q.chaseSentAt, now],
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, checked, sent });
}
