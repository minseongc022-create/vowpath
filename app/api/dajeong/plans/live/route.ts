import { NextResponse } from "next/server";
import { z } from "zod";
import { reviseDajeongPlanWithDiscovery } from "@/dajeong/lib/concierge";
import { getSharedPlanRecord, publishSharedPlan, upsertPace } from "@/dajeong/lib/companion-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";
import { resweepPlan } from "@/dajeong/lib/notification-sweep";
import { redactPlanForViewer, sanitizeMessageForViewer } from "@/dajeong/lib/secrecy";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";

const schema = z.object({
  planId: z.string().trim().min(1).max(120),
  actorId: z.string().trim().min(1).max(80),
  actorName: z.string().trim().min(1).max(20),
  instruction: z.string().trim().min(1).max(300),
  targetCategory: z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]).optional(),
  targetItemId: z.string().trim().min(1).max(140).optional(),
  expectedVersion: z.number().int().optional(),
});

const NOT_FOUND = "이 계획을 찾을 수 없어요.";

/**
 * Once a plan is shared, both people can talk to the concierge about it — the same
 * reviseDajeongPlanWithDiscovery used for solo plans — but the canonical copy has to live
 * here so companions never see the owner's raw (secret-including) state. Each response is
 * redacted for whichever actor asked, and any generated text is scrubbed the same way so a
 * side-effect summary ("이어서 X 시작 시간을 밀었어요") can't name a secret item either.
 */
export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 });
  const { planId, actorId, actorName, instruction, targetCategory, targetItemId, expectedVersion } = parsed.data;
  if (!(await verifyClaimedIdentity(actorId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });

  const record = await getSharedPlanRecord(planId);
  // Same 404 whether the plan doesn't exist or the caller isn't a participant — never lets a
  // client learn the difference between "no such plan" and "not yours".
  if (!record || (record.ownerId !== actorId && record.companionId !== actorId)) {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  if (expectedVersion != null && expectedVersion !== record.version) {
    return NextResponse.json({ error: "다른 사람이 방금 이 계획을 바꿨어요. 최신 내용을 다시 불러올게요.", conflict: true, plan: redactPlanForViewer(record.plan, actorId), version: record.version }, { status: 409 });
  }

  const result = await reviseDajeongPlanWithDiscovery(record.plan, instruction, targetCategory, targetItemId, actorId);
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
    const status = published.conflict ? 409 : 404;
    return NextResponse.json({ error: published.error, conflict: Boolean(published.conflict), plan: published.conflict ? redactPlanForViewer(published.conflict.plan, actorId) : undefined, version: published.conflict?.version }, { status });
  }

  if (result.paceUpdate?.scope === "profile") {
    const companionKey = record.ownerId === actorId ? record.companionId : record.ownerId;
    await upsertPace(actorId, companionKey, { density: result.paceUpdate.density, placesPerDay: result.paceUpdate.placesPerDay, notes: [result.paceUpdate.note] });
  }

  try {
    await resweepPlan(planId);
  } catch {
    // Never let notification bookkeeping fail the actual plan edit the user is waiting on.
  }

  const finalPlan = published.record.plan;
  const redacted = redactPlanForViewer(finalPlan, actorId);
  return NextResponse.json({
    plan: redacted,
    version: published.record.version,
    message: sanitizeMessageForViewer(finalPlan, actorId, result.message),
    changedCategories: result.changedCategories,
    proposal: result.proposal ? { ...result.proposal, message: sanitizeMessageForViewer(finalPlan, actorId, result.proposal.message), reason: sanitizeMessageForViewer(finalPlan, actorId, result.proposal.reason), plan: redactPlanForViewer(result.proposal.plan, actorId) } : undefined,
  });
}
