import { NextResponse } from "next/server";
import { z } from "zod";
import { reviseDajeongPlanWithDiscovery } from "@/dajeong/lib/concierge";
import { getSharedPlanRecord, publishSharedPlan, upsertPace } from "@/dajeong/lib/companion-store";
import { redactPlanForViewer } from "@/dajeong/lib/secrecy";

const schema = z.object({
  planId: z.string().trim().min(1).max(120),
  actorId: z.string().trim().min(1).max(80),
  actorName: z.string().trim().min(1).max(20),
  instruction: z.string().trim().min(1).max(300),
  targetCategory: z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]).optional(),
  targetItemId: z.string().trim().min(1).max(140).optional(),
  expectedVersion: z.number().int().optional(),
});

/**
 * Once a plan is shared, both people can talk to the concierge about it — the same
 * reviseDajeongPlanWithDiscovery used for solo plans — but the canonical copy has to live
 * here so companions never see the owner's raw (secret-including) state. Each response is
 * redacted for whichever actor asked.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 });
  const { planId, actorId, actorName, instruction, targetCategory, targetItemId, expectedVersion } = parsed.data;

  const record = await getSharedPlanRecord(planId);
  if (!record) return NextResponse.json({ error: "공유된 계획을 찾지 못했어요." }, { status: 404 });
  if (record.ownerId !== actorId && record.companionId !== actorId) return NextResponse.json({ error: "이 계획을 바꿀 수 있는 권한이 없어요." }, { status: 403 });
  if (expectedVersion != null && expectedVersion !== record.version) {
    return NextResponse.json({ error: "다른 사람이 방금 이 계획을 바꿨어요. 최신 내용을 다시 불러올게요.", conflict: true, plan: redactPlanForViewer(record.plan, actorId), version: record.version }, { status: 409 });
  }

  const result = await reviseDajeongPlanWithDiscovery(record.plan, instruction, targetCategory, targetItemId);
  const changeEntry = {
    id: `change_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    actorId,
    actorLabel: actorName,
    summary: result.message,
    createdAt: new Date().toISOString(),
  };
  const nextPlan = { ...result.plan, lastEditedBy: actorId, changeLog: [...(result.plan.changeLog ?? []), changeEntry].slice(-40) };

  const published = await publishSharedPlan(planId, actorId, () => nextPlan, expectedVersion);
  if (!published.ok) {
    return NextResponse.json({ error: published.error, conflict: true, plan: published.conflict ? redactPlanForViewer(published.conflict.plan, actorId) : undefined, version: published.conflict?.version }, { status: 409 });
  }

  if (result.paceUpdate?.scope === "profile") {
    const companionKey = record.ownerId === actorId ? record.companionId : record.ownerId;
    await upsertPace(actorId, companionKey, { density: result.paceUpdate.density, placesPerDay: result.paceUpdate.placesPerDay, notes: [result.paceUpdate.note] });
  }

  const redacted = redactPlanForViewer(published.record.plan, actorId);
  return NextResponse.json({
    plan: redacted,
    version: published.record.version,
    message: result.message,
    changedCategories: result.changedCategories,
    proposal: result.proposal ? { ...result.proposal, plan: redactPlanForViewer(result.proposal.plan, actorId) } : undefined,
  });
}
