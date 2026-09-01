import { NextResponse } from "next/server";
import { z } from "zod";
import { prepareReservationOrder } from "@/dajeong/lib/reservation-engine";
import type { DajeongPlan } from "@/dajeong/lib/types";

const schema = z.object({ plan: z.record(z.string(), z.unknown()) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "예약 준비 목록을 만들지 못했어요." }, { status: 400 });
  return NextResponse.json({ order: prepareReservationOrder(parsed.data.plan as DajeongPlan) });
}
