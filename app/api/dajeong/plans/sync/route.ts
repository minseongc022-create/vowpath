import { NextResponse } from "next/server";
import { z } from "zod";
import { publishSharedPlan } from "@/dajeong/lib/companion-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";
import { redactPlanForViewer } from "@/dajeong/lib/secrecy";
import type { DajeongPlan } from "@/dajeong/lib/types";

const schema = z.object({
  planId: z.string().trim().min(1).max(120),
  actorId: z.string().trim().min(1).max(80),
  actorName: z.string().trim().min(1).max(20),
  plan: z.record(z.string(), z.unknown()),
  summary: z.string().trim().max(200),
  expectedVersion: z.number().int().optional(),
});

/**
 * For direct UI mutations that are already fully computed client-side (candidate pick,
 * accepted route proposal, plan confirmation) — pushes the result to the shared canonical
 * copy without re-running the concierge, so a companion's screen picks it up too.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 });
  const { planId, actorId, actorName, plan, summary, expectedVersion } = parsed.data;
  if (!(await verifyClaimedIdentity(actorId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  const changeEntry = {
    id: `change_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    actorId,
    actorLabel: actorName,
    summary,
    createdAt: new Date().toISOString(),
  };
  const incoming = plan as DajeongPlan;
  const published = await publishSharedPlan(planId, actorId, (current) => ({
    ...incoming,
    lastEditedBy: actorId,
    changeLog: [...(current.changeLog ?? []), changeEntry].slice(-40),
  }), expectedVersion);
  if (!published.ok) {
    const status = published.conflict ? 409 : 404;
    return NextResponse.json({ error: published.error, conflict: Boolean(published.conflict), plan: published.conflict ? redactPlanForViewer(published.conflict.plan, actorId) : undefined, version: published.conflict?.version }, { status });
  }
  return NextResponse.json({ plan: redactPlanForViewer(published.record.plan, actorId), version: published.record.version });
}
