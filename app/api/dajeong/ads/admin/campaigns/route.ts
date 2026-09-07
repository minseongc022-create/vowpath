import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adFunnel } from "@/dajeong/lib/ads";
import { adStateStore } from "@/dajeong/lib/ads-store";

const category = z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]);
const schema = z.object({
  advertiser: z.object({ name: z.string().min(2).max(80) }),
  merchant: z.object({ name: z.string().min(2).max(80), region: z.string().min(1).max(40), categories: z.array(category).min(1).max(9), verifiedAt: z.string().datetime() }),
  campaign: z.object({ name: z.string().min(2).max(100), startsAt: z.string().datetime(), endsAt: z.string().datetime(), targeting: z.object({ regions: z.array(z.string().max(40)).max(20), categories: z.array(category).max(9), occasions: z.array(z.string().max(40)).max(20), budgetMin: z.number().nonnegative().optional(), budgetMax: z.number().positive().optional() }), budget: z.object({ totalKrw: z.number().int().positive(), dailyKrw: z.number().int().positive(), impressionCap: z.number().int().positive().optional(), impressionCostKrw: z.number().int().nonnegative().default(10) }) }).refine((value) => new Date(value.startsAt) < new Date(value.endsAt) && value.budget.dailyKrw <= value.budget.totalKrw, "캠페인 기간과 예산을 확인해 주세요."),
  creative: z.object({ headline: z.string().min(2).max(80), body: z.string().min(2).max(180), imageUrl: z.string().url().refine((value) => /^https?:\/\//i.test(value), "HTTP(S) 이미지만 허용합니다.").optional(), destinationUrl: z.string().url().refine((value) => /^https?:\/\//i.test(value), "HTTP(S) 링크만 허용합니다.") }),
  surface: z.enum(["plan_sidebar", "execution_footer"]),
});

function authorized(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(process.env.HARUWITH_ADS_ADMIN_TOKEN && token === process.env.HARUWITH_ADS_ADMIN_TOKEN);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "광고주·업체·캠페인·소재 정보를 확인해 주세요." }, { status: 400 });
  const now = new Date().toISOString();
  const result = await adStateStore.update((state) => {
    const advertiserId = `adv_${randomUUID()}`;
    const merchantId = `mer_${randomUUID()}`;
    const campaignId = `cam_${randomUUID()}`;
    const creativeId = `cre_${randomUUID()}`;
    const placementId = `plc_${randomUUID()}`;
    state.advertisers[advertiserId] = { id: advertiserId, name: parsed.data.advertiser.name, status: "active", createdAt: now };
    state.merchants[merchantId] = { id: merchantId, advertiserId, ...parsed.data.merchant, status: "active" };
    state.campaigns[campaignId] = { id: campaignId, advertiserId, merchantId, name: parsed.data.campaign.name, status: "active", startsAt: parsed.data.campaign.startsAt, endsAt: parsed.data.campaign.endsAt, targeting: parsed.data.campaign.targeting, budget: { ...parsed.data.campaign.budget, spentKrw: 0 }, createdAt: now };
    state.creatives[creativeId] = { id: creativeId, campaignId, ...parsed.data.creative, disclosure: "Sponsored", status: "active" };
    state.placements[placementId] = { id: placementId, campaignId, creativeId, surface: parsed.data.surface, status: "active" };
    return { advertiserId, merchantId, campaignId, creativeId, placementId };
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = await adStateStore.read();
  return NextResponse.json({ advertisers: Object.values(state.advertisers), merchants: Object.values(state.merchants), campaigns: Object.values(state.campaigns), creatives: Object.values(state.creatives), placements: Object.values(state.placements), funnel: adFunnel(state) });
}
