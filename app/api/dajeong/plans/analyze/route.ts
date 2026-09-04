import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeSituation } from "@/dajeong/lib/situation";

const schema = z.object({
  request: z.string().trim().min(5).max(500),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "상황을 조금만 더 자세히 적어줘." }, { status: 400 });
  return NextResponse.json({ understanding: analyzeSituation(parsed.data) });
}
