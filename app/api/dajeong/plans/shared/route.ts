import { NextResponse } from "next/server";
import { getSharedPlanRecord, listMySharedPlans, listSharedWithMe } from "@/dajeong/lib/companion-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";
import { redactPlanForViewer } from "@/dajeong/lib/secrecy";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const viewerId = params.get("viewerId")?.trim();
  const planId = params.get("planId")?.trim();
  if (!viewerId) return NextResponse.json({ error: "viewerId가 필요해." }, { status: 400 });
  if (!(await verifyClaimedIdentity(viewerId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });

  if (planId) {
    const record = await getSharedPlanRecord(planId);
    const plan = record ? redactPlanForViewer(record.plan, viewerId) : null;
    // Same 404 whether the plan is missing or the viewer just isn't a participant.
    if (!record || !plan) return NextResponse.json({ error: "이 계획을 찾을 수 없어." }, { status: 404 });
    return NextResponse.json({ plan, version: record.version, isOwner: record.ownerId === viewerId });
  }

  const [sharedWithMe, mine] = await Promise.all([listSharedWithMe(viewerId), listMySharedPlans(viewerId)]);
  return NextResponse.json({
    sharedWithMe: sharedWithMe.map((record) => ({ planId: record.planId, ownerName: record.ownerName, plan: redactPlanForViewer(record.plan, viewerId), version: record.version, updatedAt: record.updatedAt })),
    mine: mine.map((record) => ({ planId: record.planId, companionName: record.companionName, plan: record.plan, version: record.version, updatedAt: record.updatedAt })),
  });
}
