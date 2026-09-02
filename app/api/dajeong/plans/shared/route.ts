import { NextResponse } from "next/server";
import { getSharedPlanRecord, listMySharedPlans, listSharedWithMe } from "@/dajeong/lib/companion-store";
import { redactPlanForViewer } from "@/dajeong/lib/secrecy";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const viewerId = params.get("viewerId")?.trim();
  const planId = params.get("planId")?.trim();
  if (!viewerId) return NextResponse.json({ error: "viewerId가 필요해요." }, { status: 400 });

  if (planId) {
    const record = await getSharedPlanRecord(planId);
    if (!record) return NextResponse.json({ error: "공유된 계획을 찾지 못했어요." }, { status: 404 });
    const plan = redactPlanForViewer(record.plan, viewerId);
    if (!plan) return NextResponse.json({ error: "이 계획을 볼 수 있는 권한이 없어요." }, { status: 403 });
    return NextResponse.json({ plan, version: record.version, isOwner: record.ownerId === viewerId });
  }

  const [sharedWithMe, mine] = await Promise.all([listSharedWithMe(viewerId), listMySharedPlans(viewerId)]);
  return NextResponse.json({
    sharedWithMe: sharedWithMe.map((record) => ({ planId: record.planId, ownerName: record.ownerName, plan: redactPlanForViewer(record.plan, viewerId), version: record.version, updatedAt: record.updatedAt })),
    mine: mine.map((record) => ({ planId: record.planId, companionName: record.companionName, plan: record.plan, version: record.version, updatedAt: record.updatedAt })),
  });
}
