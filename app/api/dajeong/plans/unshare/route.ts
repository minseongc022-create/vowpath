import { NextResponse } from "next/server";
import { z } from "zod";
import { unshareplan } from "@/dajeong/lib/companion-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

const schema = z.object({
  planId: z.string().trim().min(1).max(120),
  actorId: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해 주세요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.actorId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  const ok = await unshareplan(parsed.data.planId, parsed.data.actorId);
  if (!ok) return NextResponse.json({ error: "공유된 계획을 찾지 못했거나 권한이 없어요." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
