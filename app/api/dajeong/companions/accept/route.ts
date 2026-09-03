import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptInvite, upsertPerson } from "@/dajeong/lib/companion-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

const schema = z.object({
  code: z.string().trim().min(4).max(12),
  personId: z.string().trim().min(1).max(80),
  personName: z.string().trim().min(1).max(20),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "초대 코드와 이름을 확인해 주세요." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  await upsertPerson(parsed.data.personId, parsed.data.personName);
  const result = await acceptInvite(parsed.data.code, parsed.data.personId, parsed.data.personName);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ link: result.link });
}
