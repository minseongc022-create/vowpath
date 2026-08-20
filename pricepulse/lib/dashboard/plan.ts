/**
 * Plan limits and gating. One paid tier ("pro") for now — the product
 * definition's tier 2 (자동 가격조정) needs the repricer engine itself,
 * which doesn't exist yet, so there's nothing to gate for it.
 */
import { createClient } from "@supabase/supabase-js";

export type PricepulsePlan = "free" | "pro";

export const PLAN_LIMITS = {
  free: { maxKeywords: 3, priceHistory: false, trending: false },
  pro: { maxKeywords: 50, priceHistory: true, trending: true },
} as const;

/** ₩19,900 anchors on the same price point sellers already pay 아이템스카우트. */
export const PRO_PRICE_KRW = 19900;
export const PRO_DURATION_DAYS = 30;

export type SellerPlanInfo = {
  plan: PricepulsePlan;
  expiresAt: string | null;
  active: boolean;
};

function client() {
  const url = process.env.PRICEPULSE_SUPABASE_URL?.trim();
  const key = process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Pricepulse: Supabase not configured (see pricepulse/README.md)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Plan is read fresh from the DB on every request rather than cached in the
 * session JWT — a seller who just paid should see Pro immediately, not after
 * their cookie happens to refresh.
 */
export async function getSellerPlan(sellerId: string): Promise<SellerPlanInfo> {
  const { data, error } = await client()
    .from("pricepulse_sellers")
    .select("plan, plan_expires_at")
    .eq("id", sellerId)
    .maybeSingle();
  if (error) throw new Error(`getSellerPlan: ${error.message}`);
  if (!data) return { plan: "free", expiresAt: null, active: false };

  const expiresAt = data.plan_expires_at as string | null;
  const active = data.plan === "pro" && (!expiresAt || new Date(expiresAt) > new Date());
  return { plan: active ? "pro" : "free", expiresAt, active };
}

export function limitsFor(plan: PricepulsePlan) {
  return PLAN_LIMITS[plan];
}
