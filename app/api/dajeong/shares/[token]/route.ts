import { NextResponse } from "next/server";
import { z } from "zod";
import { reviseDajeongPlanWithDiscovery } from "@/dajeong/lib/concierge";
import { mergeViewerPlanUpdate, projectPlanForViewer } from "@/dajeong/lib/collaboration";
import { getSharedPlan, syncOwnerPlan, updateSharedPlan, viewerPayload } from "@/dajeong/lib/share-store";
import { scheduleDajeongPlan } from "@/dajeong/lib/schedule-engine";
import type { DajeongPlan } from "@/dajeong/lib/types";

const patchSchema = z.object({
  actor: z.object({ id: z.string().trim().min(4).max(120), name: z.string().trim().min(1).max(40), relation: z.string().trim().max(40).optional() }),
  baseRevision: z.number().int().min(0),
  ownerToken: z.string().trim().min(20).max(160).optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  instruction: z.string().trim().min(2).max(300).optional(),
  targetItemId: z.string().trim().min(1).max(160).optional(),
}).refine((value) => Boolean(value.plan || value.instruction), "plan 또는 instruction이 필요합니다.");

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await getSharedPlan(token);
  if (!record) return NextResponse.json({ error: "공유 계획을 찾지 못했어요." }, { status: 404 });
  const actorId = new URL(request.url).searchParams.get("actorId")?.slice(0, 120) || "shared_guest";
  const payload = viewerPayload(record, actorId, request.headers.get("x-haruon-owner-token") ?? undefined);
  if (!payload.plan) return NextResponse.json({ error: "현재 이 계획은 공유되지 않고 있어요." }, { status: 403 });
  return NextResponse.json(payload);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "수정 요청을 확인해 주세요." }, { status: 400 });
  const record = await getSharedPlan(token);
  if (!record) return NextResponse.json({ error: "공유 계획을 찾지 못했어요." }, { status: 404 });
  if (parsed.data.baseRevision !== record.revision) return NextResponse.json({ error: "다른 사람이 먼저 계획을 바꿨어요.", ...viewerPayload(record, parsed.data.actor.id, parsed.data.ownerToken) }, { status: 409 });
  if (parsed.data.plan) {
    if (!parsed.data.ownerToken) return NextResponse.json({ error: "소유자 확인이 필요해요." }, { status: 403 });
    const result = await syncOwnerPlan(token, parsed.data.ownerToken, parsed.data.plan as DajeongPlan, parsed.data.baseRevision);
    if (!result.ok) return NextResponse.json({ error: result.reason === "conflict" ? "최신 계획을 다시 불러와 주세요." : "소유자만 전체 계획을 동기화할 수 있어요.", ...viewerPayload(result.record, parsed.data.actor.id, result.reason === "conflict" ? parsed.data.ownerToken : undefined) }, { status: result.reason === "conflict" ? 409 : 403 });
    return NextResponse.json({ ...viewerPayload(result.record, parsed.data.actor.id, parsed.data.ownerToken), ownerPlan: result.record.plan });
  }
  if (record.access !== "editor") return NextResponse.json({ error: "이 공유 링크는 보기 전용이에요." }, { status: 403 });
  const safePlan = projectPlanForViewer(record.plan, parsed.data.actor.id);
  if (!safePlan) return NextResponse.json({ error: "현재 이 계획은 공유되지 않고 있어요." }, { status: 403 });
  const result = await reviseDajeongPlanWithDiscovery(safePlan, parsed.data.instruction!, undefined, parsed.data.targetItemId, parsed.data.actor);
  const merged = scheduleDajeongPlan(mergeViewerPlanUpdate(record.plan, result.plan, parsed.data.actor));
  const updated = await updateSharedPlan(record, merged);
  return NextResponse.json({ ...viewerPayload(updated, parsed.data.actor.id), message: result.message, changedCategories: result.changedCategories });
}
