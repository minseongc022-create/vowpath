import { NextResponse } from "next/server";
import { z } from "zod";
import { removeSubscription } from "@/dajeong/lib/notification-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

const schema = z.object({
  personId: z.string().trim().min(1).max(80),
  endpoint: z.string().trim().min(1).max(600),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해 주세요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  await removeSubscription(parsed.data.personId, parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
