import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { patchJobRecord } from "@/lib/jobs-db";
import {
  listClosePingJobs,
  updateClosePingQuoteStatus,
} from "@/lib/closeping/quotes-service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const jobs = await listClosePingJobs(session.sub);
  const job = jobs.find((j) => j.id === id);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { userId: _u, ...quote } = job;
  return NextResponse.json({ ok: true, quote });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const body = await request.json();

    if (body.status === "won" || body.status === "lost") {
      const job = await updateClosePingQuoteStatus(session.sub, id, body.status);
      const { userId: _u, ...quote } = job;
      return NextResponse.json({ ok: true, quote });
    }

    const jobs = await listClosePingJobs(session.sub);
    const existing = jobs.find((j) => j.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (body.customerName != null) patch.customerName = String(body.customerName).slice(0, 80);
    if (body.jobDescription != null) patch.symptom = String(body.jobDescription).slice(0, 500);
    if (body.amountCents != null) {
      const cents = Math.round(Number(body.amountCents));
      if (Number.isFinite(cents) && cents > 0) patch.quotedAmountCents = cents;
    }
    if (body.customerPhone != null) patch.customerPhone = String(body.customerPhone);
    if (body.address != null) patch.address = String(body.address).slice(0, 200);

    const saved = await patchJobRecord(session.sub, id, patch);
    if (!saved) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { userId: _u, ...quote } = saved;
    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
