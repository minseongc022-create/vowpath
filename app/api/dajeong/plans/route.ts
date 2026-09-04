import { NextResponse } from "next/server";
import { z } from "zod";
import { createDajeongPlan, initializePlanVersion } from "@/dajeong/lib/plan-engine";
import { personalizePlanSummary } from "@/dajeong/lib/personalize";
import { enrichDajeongPlanWithRealPlaces } from "@/dajeong/lib/place-discovery";
import { enrichPlanWithWeather } from "@/dajeong/lib/weather";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";

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
  likedActivities: z.array(z.string().max(100)).max(30).optional(),
  dislikedActivities: z.array(z.string().max(100)).max(30).optional(),
  likedAtmospheres: z.array(z.string().max(100)).max(30).optional(),
  dislikedAtmospheres: z.array(z.string().max(100)).max(30).optional(),
  crowdTolerance: z.enum(["low", "medium", "high", "unknown"]).optional(),
  walkingTolerance: z.enum(["low", "medium", "high", "unknown"]).optional(),
  likedPlanIds: z.array(z.string().max(180)).max(100).optional(),
  dislikedPlanIds: z.array(z.string().max(180)).max(100).optional(),
  notes: z.array(z.string().max(180)).max(20),
  updatedAt: z.string().max(40),
});

const personMemoryUpdateSchema = z.object({
  preferences: z.array(z.string().max(100)).max(30),
  constraints: z.array(z.string().max(100)).max(30),
  likedFoods: z.array(z.string().max(100)).max(30),
  dislikedFoods: z.array(z.string().max(100)).max(30),
  hobbies: z.array(z.string().max(100)).max(30),
  likedActivities: z.array(z.string().max(100)).max(30),
  dislikedActivities: z.array(z.string().max(100)).max(30),
  likedAtmospheres: z.array(z.string().max(100)).max(30),
  dislikedAtmospheres: z.array(z.string().max(100)).max(30),
  crowdTolerance: z.enum(["low", "medium", "high", "unknown"]),
  walkingTolerance: z.enum(["low", "medium", "high", "unknown"]),
  notes: z.array(z.string().max(180)).max(20),
});

const requestSchema = z.object({
  request: z.string().trim().min(5).max(2_000),
  recipient: z.string().trim().max(30).optional(),
  region: z.string().trim().max(40).optional(),
  departureRegion: z.string().trim().max(40).optional(),
  budget: z.number().int().min(10_000).max(5_000_000).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  transport: z.enum(["public_transit", "car", "walking", "unknown"]).optional(),
  ageBand: ageBandSchema.optional(),
  preferences: z.array(z.string().max(180)).max(30).optional(),
  constraints: z.array(z.string().max(180)).max(30).optional(),
  planScope: z.enum(["single", "day", "trip"]).optional(),
  tripDays: z.number().int().min(1).max(14).optional(),
  tripNights: z.number().int().min(0).max(13).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  returnDepartureTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lodgingPreference: z.string().trim().max(120).optional(),
  lodgingIncludedInBudget: z.boolean().optional(),
  requestKind: z.enum(["day_plan", "trip_plan", "place_search", "reservation", "product_search"]).optional(),
  singleCategory: z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]).optional(),
  requestedCategories: z.array(z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"])).max(9).optional(),
  excludedCategories: z.array(z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"])).max(9).optional(),
  explicitUnknowns: z.array(z.string().max(80)).max(20).optional(),
  personMemoryUpdate: personMemoryUpdateSchema.optional(),
  intakeConversation: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(600) })).max(40).optional(),
  personProfile: personProfileSchema.optional(),
  desiredMoods: z.array(moodSchema).max(10).optional(),
  availabilityStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availabilityEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduleDensity: z.enum(["compact", "balanced", "relaxed"]).optional(),
  densitySpecified: z.boolean().optional(),
  homeByTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  homeTravelMinutes: z.number().int().min(0).max(300).optional(),
  temporaryCondition: z.object({ energy: z.enum(["low", "normal"]), walkingLimited: z.boolean(), notes: z.array(z.string().max(120)).max(10) }).optional(),
  budgetUsage: z.enum(["reserve", "full"]).optional(),
  mealTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  // 이름으로 지목한 가게. 여기서 빠지면 서버는 사용자가 그 가게를 말했다는 사실 자체를 모른다.
  namedPlaces: z.array(z.string().trim().min(2).max(40)).max(5).optional(),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽지 못했어." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "상황을 다섯 글자 이상 적고 예산을 확인해줘." }, { status: 400 });
  }

  const discovered = await enrichDajeongPlanWithRealPlaces(createDajeongPlan(parsed.data));
  const plan = initializePlanVersion(await personalizePlanSummary(await enrichPlanWithWeather(discovered)));
  return NextResponse.json({ plan });
}
