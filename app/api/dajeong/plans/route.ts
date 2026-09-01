import { NextResponse } from "next/server";
import { z } from "zod";
import { createDajeongPlan } from "@/dajeong/lib/plan-engine";
import { personalizePlanSummary } from "@/dajeong/lib/personalize";
import { enrichDajeongPlanWithRealPlaces } from "@/dajeong/lib/place-discovery";

const ageBandSchema = z.enum(["10대", "20대", "30대", "40대", "50대", "60대 이상", "미상"]);
const moodSchema = z.enum(["romantic", "mysterious", "trendy", "calm", "luxurious", "playful", "warm", "nature", "artistic", "hidden"]);
const personProfileSchema = z.object({
  id: z.string().max(80),
  name: z.string().max(40),
  relation: z.string().max(40),
  ageBand: ageBandSchema,
  preferences: z.array(z.string().max(100)).max(30),
  constraints: z.array(z.string().max(100)).max(30),
  likedFoods: z.array(z.string().max(100)).max(20),
  dislikedFoods: z.array(z.string().max(100)).max(20),
  hobbies: z.array(z.string().max(100)).max(20),
  moodPreferences: z.array(moodSchema).max(10),
  visitedPlaceIds: z.array(z.string().max(180)).max(100),
  likedPlaceIds: z.array(z.string().max(180)).max(100),
  dislikedPlaceIds: z.array(z.string().max(180)).max(100),
  notes: z.array(z.string().max(180)).max(20),
  updatedAt: z.string().max(40),
});

const requestSchema = z.object({
  request: z.string().trim().min(5).max(2_000),
  recipient: z.string().trim().max(30).optional(),
  region: z.string().trim().max(40).optional(),
  departureRegion: z.string().trim().max(40).optional(),
  budget: z.number().int().min(50_000).max(2_000_000).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(12).optional(),
  transport: z.enum(["public_transit", "car", "walking", "unknown"]).optional(),
  ageBand: ageBandSchema.optional(),
  preferences: z.array(z.string().max(180)).max(30).optional(),
  constraints: z.array(z.string().max(180)).max(30).optional(),
  planScope: z.enum(["single", "day", "trip"]).optional(),
  tripDays: z.number().int().min(1).max(14).optional(),
  tripNights: z.number().int().min(0).max(13).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  personProfile: personProfileSchema.optional(),
  desiredMoods: z.array(moodSchema).max(10).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽지 못했어요." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "상황을 다섯 글자 이상 적고 예산을 확인해 주세요." }, { status: 400 });
  }

  const discovered = await enrichDajeongPlanWithRealPlaces(createDajeongPlan(parsed.data));
  const plan = await personalizePlanSummary(discovered);
  return NextResponse.json({ plan });
}
