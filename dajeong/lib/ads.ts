import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type AdCategory = "activity" | "cafe" | "meal" | "view" | "lodging" | "cake" | "flower" | "gift" | "moment";
export type AdEventType = "impression" | "click" | "plan_add" | "reservation_attempt" | "reservation_success" | "conversion";

export type Advertiser = { id: string; name: string; status: "active" | "paused"; createdAt: string };
export type Merchant = { id: string; advertiserId: string; name: string; region: string; categories: AdCategory[]; verifiedAt?: string; status: "active" | "paused" };
export type Campaign = {
  id: string;
  advertiserId: string;
  merchantId: string;
  name: string;
  status: "draft" | "active" | "paused" | "ended";
  startsAt: string;
  endsAt: string;
  targeting: { regions: string[]; categories: AdCategory[]; occasions: string[]; budgetMin?: number; budgetMax?: number };
  budget: { totalKrw: number; dailyKrw: number; spentKrw: number; impressionCap?: number; impressionCostKrw?: number };
  createdAt: string;
};
export type Creative = { id: string; campaignId: string; headline: string; body: string; imageUrl?: string; destinationUrl: string; disclosure: "Sponsored"; status: "active" | "paused" };
export type AdPlacement = { id: string; campaignId: string; creativeId: string; surface: "plan_sidebar" | "execution_footer"; status: "active" | "paused" };
export type AdEvent = { id: string; type: AdEventType; impressionId: string; campaignId: string; placementId: string; at: string; planId?: string; valueKrw?: number; dedupeKey: string };
export type AdState = { advertisers: Record<string, Advertiser>; merchants: Record<string, Merchant>; campaigns: Record<string, Campaign>; creatives: Record<string, Creative>; placements: Record<string, AdPlacement>; events: AdEvent[]; dedupe: Record<string, string> };
export type SafeAdIntent = { region?: string; categories: AdCategory[]; occasion?: string; budgetBucket?: "low" | "medium" | "high"; planId?: string };

export function emptyAdState(): AdState { return { advertisers: {}, merchants: {}, campaigns: {}, creatives: {}, placements: {}, events: [], dedupe: {} }; }

export interface AdStateStore { read(): Promise<AdState>; update<T>(mutate: (state: AdState) => T | Promise<T>): Promise<T> }

export function createMemoryAdStore(seed?: AdState): AdStateStore & { state: AdState } {
  const store = { state: seed ?? emptyAdState(), async read() { return structuredClone(store.state); }, async update<T>(mutate: (state: AdState) => T | Promise<T>) { const draft = structuredClone(store.state); const result = await mutate(draft); store.state = draft; return result; } };
  return store;
}

function relevant(campaign: Campaign, merchant: Merchant, intent: SafeAdIntent, now: Date, dailySpentKrw: number): boolean {
  if (campaign.status !== "active" || merchant.status !== "active" || !merchant.verifiedAt) return false;
  if (now < new Date(campaign.startsAt) || now > new Date(campaign.endsAt)) return false;
  const impressionCost = Math.max(0, campaign.budget.impressionCostKrw ?? 0);
  if (campaign.budget.spentKrw + impressionCost > campaign.budget.totalKrw) return false;
  if (dailySpentKrw + impressionCost > campaign.budget.dailyKrw) return false;
  if (campaign.budget.impressionCap != null && campaign.budget.impressionCap <= 0) return false;
  if (campaign.targeting.regions.length && (!intent.region || !campaign.targeting.regions.some((region) => intent.region!.includes(region) || region.includes(intent.region!)))) return false;
  if (campaign.targeting.categories.length && !intent.categories.some((category) => campaign.targeting.categories.includes(category))) return false;
  if (campaign.targeting.occasions.length && (!intent.occasion || !campaign.targeting.occasions.includes(intent.occasion))) return false;
  const bucketValue = intent.budgetBucket === "low" ? 70_000 : intent.budgetBucket === "medium" ? 180_000 : intent.budgetBucket === "high" ? 400_000 : undefined;
  if (bucketValue != null && campaign.targeting.budgetMin != null && bucketValue < campaign.targeting.budgetMin) return false;
  if (bucketValue != null && campaign.targeting.budgetMax != null && bucketValue > campaign.targeting.budgetMax) return false;
  return true;
}

function score(campaign: Campaign, intent: SafeAdIntent): number {
  let value = 0;
  if (intent.region && campaign.targeting.regions.some((region) => intent.region!.includes(region) || region.includes(intent.region!))) value += 4;
  value += intent.categories.filter((category) => campaign.targeting.categories.includes(category)).length * 3;
  if (intent.occasion && campaign.targeting.occasions.includes(intent.occasion)) value += 2;
  return value;
}

function sign(payload: string, secret: string): string { return createHmac("sha256", secret).update(payload).digest("hex"); }

export async function serveSponsoredPlacement(store: AdStateStore, intent: SafeAdIntent, surface: AdPlacement["surface"], secret: string, now = new Date()) {
  return store.update((state) => {
    const today = now.toISOString().slice(0, 10);
    const candidates = Object.values(state.placements).filter((placement) => placement.status === "active" && placement.surface === surface).map((placement) => {
      const campaign = state.campaigns[placement.campaignId];
      const creative = state.creatives[placement.creativeId];
      const merchant = campaign ? state.merchants[campaign.merchantId] : undefined;
      const dailySpent = campaign ? state.events.filter((event) => event.campaignId === campaign.id && event.type === "impression" && event.at.startsWith(today)).reduce((sum, event) => sum + (event.valueKrw ?? 0), 0) : 0;
      return campaign && creative?.status === "active" && merchant && relevant(campaign, merchant, intent, now, dailySpent) ? { placement, campaign, creative, merchant, score: score(campaign, intent) } : null;
    }).filter((value): value is NonNullable<typeof value> => Boolean(value)).sort((a, b) => b.score - a.score || a.campaign.id.localeCompare(b.campaign.id));
    const selected = candidates[0];
    if (!selected || selected.score <= 0) return null;
    const impressionId = `imp_${randomUUID()}`;
    const impressionCost = Math.max(0, selected.campaign.budget.impressionCostKrw ?? 0);
    const event: AdEvent = { id: `ade_${randomUUID()}`, type: "impression", impressionId, campaignId: selected.campaign.id, placementId: selected.placement.id, at: now.toISOString(), planId: intent.planId, valueKrw: impressionCost, dedupeKey: `impression:${impressionId}` };
    state.events.push(event);
    state.dedupe[event.dedupeKey] = event.id;
    selected.campaign.budget.spentKrw += impressionCost;
    if (selected.campaign.budget.impressionCap != null) selected.campaign.budget.impressionCap -= 1;
    const tokenPayload = `${impressionId}.${selected.campaign.id}.${selected.placement.id}`;
    return { impressionId, attributionToken: `${tokenPayload}.${sign(tokenPayload, secret)}`, disclosure: "Sponsored" as const, merchant: { id: selected.merchant.id, name: selected.merchant.name, region: selected.merchant.region }, creative: selected.creative, placement: selected.placement };
  });
}

export function verifyAttributionToken(token: string, secret: string): { impressionId: string; campaignId: string; placementId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(payload, secret));
  const provided = Buffer.from(parts[3]);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  return { impressionId: parts[0], campaignId: parts[1], placementId: parts[2] };
}

export async function recordAdEvent(store: AdStateStore, token: string, secret: string, type: Exclude<AdEventType, "impression">, values: { planId?: string; valueKrw?: number; dedupeSuffix?: string } = {}, now = new Date()): Promise<{ recorded: boolean }> {
  const verified = verifyAttributionToken(token, secret);
  if (!verified) throw new Error("INVALID_ATTRIBUTION_TOKEN");
  return store.update((state) => {
    const impression = state.events.find((event) => event.type === "impression" && event.impressionId === verified.impressionId && event.campaignId === verified.campaignId && event.placementId === verified.placementId);
    if (!impression) throw new Error("IMPRESSION_NOT_FOUND");
    const dedupeKey = `${type}:${verified.impressionId}:${values.dedupeSuffix ?? values.planId ?? "once"}`;
    if (state.dedupe[dedupeKey]) return { recorded: false };
    const event: AdEvent = { id: `ade_${randomUUID()}`, type, ...verified, at: now.toISOString(), planId: values.planId, valueKrw: values.valueKrw, dedupeKey };
    state.events.push(event);
    state.dedupe[dedupeKey] = event.id;
    return { recorded: true };
  });
}

export function adFunnel(state: AdState) {
  const count = (type: AdEventType) => state.events.filter((event) => event.type === type).length;
  return { impressions: count("impression"), clicks: count("click"), planAdds: count("plan_add"), reservationAttempts: count("reservation_attempt"), reservationSuccesses: count("reservation_success"), conversions: count("conversion") };
}
