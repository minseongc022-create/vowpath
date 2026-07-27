import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createQuote } from "@/lib/db";
import { normalizePhone, parseCsv } from "@/lib/quotes";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const rows = parseCsv(String(body.csv ?? ""));
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows. CSV: name, phone, description, amount, address?" },
      { status: 400 },
    );
  }

  const quotes = [];
  for (const row of rows.slice(0, 50)) {
    quotes.push(
      await createQuote(session.sub, {
        customerName: row.customerName,
        customerPhone: normalizePhone(row.customerPhone),
        description: row.description,
        amountCents: row.amountCents,
        address: row.address,
      }),
    );
  }
  return NextResponse.json({ ok: true, imported: quotes.length, quotes });
}
