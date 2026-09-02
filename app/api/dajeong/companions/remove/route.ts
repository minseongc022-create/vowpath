import { NextResponse } from "next/server";
import { z } from "zod";
import { removeCompanion } from "@/dajeong/lib/companion-store";

const schema = z.object({
  linkId: z.string().trim().min(1).max(120),
  personId: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해 주세요." }, { status: 400 });
  const ok = await removeCompanion(parsed.data.linkId, parsed.data.personId);
  if (!ok) return NextResponse.json({ error: "연결을 찾지 못했어요." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
