import { NextResponse } from "next/server";
import { z } from "zod";
import { createSharedPlan } from "@/dajeong/lib/share-store";
import type { DajeongPlan } from "@/dajeong/lib/types";

const schema = z.object({
  plan: z.record(z.string(), z.unknown()),
  owner: z.object({ id: z.string().trim().min(4).max(120), name: z.string().trim().min(1).max(40), relation: z.string().trim().max(40).optional() }),
  access: z.enum(["viewer", "editor"]).default("editor"),
  companionName: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "공유할 계획과 동반자 정보를 확인해 주세요." }, { status: 400 });
  const record = await createSharedPlan(parsed.data.plan as DajeongPlan, parsed.data.owner, parsed.data.access, parsed.data.companionName);
  return NextResponse.json({
    plan: record.plan,
    revision: record.revision,
    shareUrl: `/dajeong/shared/${record.token}`,
    token: record.token,
    ownerToken: record.ownerToken,
  });
}
