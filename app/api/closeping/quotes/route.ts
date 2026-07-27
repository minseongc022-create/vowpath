import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import {
  computeClosePingStats,
  createClosePingQuote,
  listClosePingJobs,
} from "@/lib/closeping/quotes-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listClosePingJobs(session.sub);
  const stats = computeClosePingStats(jobs);
  const quotes = jobs.map(({ userId: _u, ...j }) => j);

  return NextResponse.json({ ok: true, quotes, stats });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const job = await createClosePingQuote(session.sub, {
      customerName: String(body.customerName ?? ""),
      customerPhone: String(body.customerPhone ?? ""),
      jobDescription: String(body.jobDescription ?? ""),
      amountCents: Math.round(Number(body.amountCents)),
      address: body.address ? String(body.address) : undefined,
      trade: body.trade ? String(body.trade) : undefined,
    });
    const { userId: _u, ...quote } = job;
    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "INVALID_AMOUNT" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
