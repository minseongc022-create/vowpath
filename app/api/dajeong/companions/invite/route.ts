import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvite, upsertPerson } from "@/dajeong/lib/companion-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

const schema = z.object({
  personId: z.string().trim().min(1).max(80),
  personName: z.string().trim().min(1).max(20),
  relationLabel: z.enum(["연인", "친구", "가족", "동료", "기타"]),
  note: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "초대에 필요한 정보를 확인해줘." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  await upsertPerson(parsed.data.personId, parsed.data.personName);
  const invite = await createInvite(parsed.data.personId, parsed.data.personName, parsed.data.relationLabel, parsed.data.note);
  return NextResponse.json({ invite });
}
