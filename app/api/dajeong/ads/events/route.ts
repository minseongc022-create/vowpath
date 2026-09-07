import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdEvent } from "@/dajeong/lib/ads";
import { adStateStore } from "@/dajeong/lib/ads-store";
import { checkRateLimit, clientIpFromRequest, rateLimitKey } from "@/lib/security/rate-limit";

const schema = z.object({
  attributionToken: z.string().min(20).max(500),
  // Reservation success and monetary conversion are server-side events only.
  type: z.enum(["click", "plan_add"]),
  planId: z.string().max(180).optional(),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit({ key: rateLimitKey("haruwith:ad-event", clientIpFromRequest(request)), limit: 300, windowSeconds: 60 * 60 });
  if (!limit.ok) return NextResponse.json({ error: "Too many ad events" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "광고 이벤트를 확인해 주세요." }, { status: 400 });
  const secret = process.env.HARUWITH_ADS_SIGNING_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Ads attribution is not configured" }, { status: 503 });
  try {
    const result = await recordAdEvent(adStateStore, parsed.data.attributionToken, secret, parsed.data.type, parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "유효하지 않은 광고 attribution이에요." }, { status: 403 });
  }
}
