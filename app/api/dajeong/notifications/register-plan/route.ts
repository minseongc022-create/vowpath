import { NextResponse } from "next/server";
import { z } from "zod";
import { getRegisteredPlan, registerPlanForNotifications, unregisterPlan } from "@/dajeong/lib/notification-store";
import { resweepPlan } from "@/dajeong/lib/notification-sweep";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";
import type { DajeongPlan } from "@/dajeong/lib/types";

const schema = z.object({
  personId: z.string().trim().min(1).max(80),
  plan: z.record(z.string(), z.unknown()),
});

/**
 * A solo (non-shared) plan otherwise never leaves the browser — registering it here is what
 * "알려줘" on the permission prompt actually does: it gives the server a copy so scheduled
 * notifications can be computed and dispatched even while the app is closed. Only the owner
 * themselves ever receives owner-directed notifications from it, so this doesn't create any new
 * exposure to a companion; it's solely for this person's own device(s).
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해 주세요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  const plan = parsed.data.plan as DajeongPlan;
  await registerPlanForNotifications(plan, parsed.data.personId);
  await resweepPlan(plan.id);
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ personId: z.string().trim().min(1).max(80), planId: z.string().trim().min(1).max(120) });

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해 주세요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  const registered = await getRegisteredPlan(parsed.data.planId);
  if (registered && registered.ownerId !== parsed.data.personId) return NextResponse.json({ error: "이 계획을 등록 해제할 권한이 없어요." }, { status: 403 });
  await unregisterPlan(parsed.data.planId);
  return NextResponse.json({ ok: true });
}
