import { NextResponse } from "next/server";
import { z } from "zod";
import { serveSponsoredPlacement } from "@/dajeong/lib/ads";
import { adStateStore } from "@/dajeong/lib/ads-store";
import { checkRateLimit, clientIpFromRequest, rateLimitKey } from "@/lib/security/rate-limit";

const schema = z.object({
  intent: z.object({ region: z.string().max(40).optional(), categories: z.array(z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"])).max(9), occasion: z.string().max(40).optional(), budgetBucket: z.enum(["low", "medium", "high"]).optional(), planId: z.string().max(180).optional() }),
  surface: z.enum(["plan_sidebar", "execution_footer"]),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit({ key: rateLimitKey("haruwith:ad-serve", clientIpFromRequest(request)), limit: 120, windowSeconds: 60 * 60 });
  if (!limit.ok) return NextResponse.json({ placement: null, reason: "rate_limited" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "광고 문맥을 확인해 주세요." }, { status: 400 });
  const secret = process.env.HARUWITH_ADS_SIGNING_SECRET?.trim();
  if (!secret) return NextResponse.json({ placement: null, reason: "ads_not_configured" });
  const placement = await serveSponsoredPlacement(adStateStore, parsed.data.intent, parsed.data.surface, secret);
  return NextResponse.json({ placement });
}
