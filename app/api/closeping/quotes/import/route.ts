import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import {
  createClosePingQuote,
  parseClosePingCsv,
} from "@/lib/closeping/quotes-service";

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const csv = String(body.csv ?? "");
    const rows = parseClosePingCsv(csv);
    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid rows. Use CSV: name, phone, description, amount, address (optional)",
        },
        { status: 400 },
      );
    }

    const created = [];
    for (const row of rows.slice(0, 50)) {
      const job = await createClosePingQuote(session.sub, row);
      const { userId: _u, ...quote } = job;
      created.push(quote);
    }

    return NextResponse.json({ ok: true, imported: created.length, quotes: created });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
