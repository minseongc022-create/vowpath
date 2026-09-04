import { NextResponse } from "next/server";
import { z } from "zod";
import { createManualDajeongPlan, type ManualPick } from "@/dajeong/lib/manual-plan";
import { enrichPlanWithWeather } from "@/dajeong/lib/weather";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";

const categorySchema = z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift"]);

const pickSchema = z.object({
  placeId: z.string().min(1).max(180),
  name: z.string().min(1).max(120),
  address: z.string().max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  category: categorySchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(10).max(1440),
  price: z.number().int().min(0).max(5_000_000),
  mapsUrl: z.string().url().max(500),
  phoneNumber: z.string().max(40).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).max(1_000_000).optional(),
  sourceLabel: z.string().max(80).optional(),
  memo: z.string().max(200).optional(),
});

const bodySchema = z.object({
  request: z.string().max(500).optional(),
  region: z.string().min(1).max(40),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  recipient: z.string().max(30).optional(),
  budget: z.number().int().min(0).max(5_000_000).optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  transport: z.enum(["public_transit", "car", "walking", "unknown"]).optional(),
  picks: z.array(pickSchema).min(1).max(12),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "담은 장소나 기본 정보를 다시 확인해줘." }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const plan = createManualDajeongPlan({
      request: body.request?.trim() || `${body.region}에서 직접 만든 계획`,
      region: body.region,
      targetDate: body.targetDate,
      recipient: body.recipient,
      budget: body.budget,
      partySize: body.partySize,
      transport: body.transport,
      planScope: "day",
      picks: body.picks as ManualPick[],
    });
    // 날씨는 자동 계획과 같은 근거를 쓰도록 여기서도 붙인다(실패해도 계획은 그대로 나간다).
    const withWeather = await enrichPlanWithWeather(plan).catch(() => plan);
    return NextResponse.json({ plan: withWeather });
  } catch {
    return NextResponse.json({ error: "계획을 만들지 못했어. 잠시 후 다시 시도해줘." }, { status: 500 });
  }
}
