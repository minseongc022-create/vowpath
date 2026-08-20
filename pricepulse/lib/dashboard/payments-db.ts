/**
 * Pro-plan checkout bookkeeping. Payment confirmation itself is not
 * reimplemented here — it reuses giu/lib/toss-payments.ts's confirmTossPayment,
 * the same Toss Payments code path already live for Giu. This file only
 * tracks the order row and flips the seller's plan on success.
 */
import { createClient } from "@supabase/supabase-js";
import { PRO_DURATION_DAYS, PRO_PRICE_KRW } from "./plan.ts";

function client() {
  const url = process.env.PRICEPULSE_SUPABASE_URL?.trim();
  const key = process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Pricepulse: Supabase not configured (see pricepulse/README.md)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type PendingPayment = { orderId: string; amount: number };

/** Reuse a seller's still-pending order (so a page refresh doesn't create a new one) or make one. */
export async function getOrCreatePendingPayment(sellerId: string): Promise<PendingPayment> {
  const db = client();

  const { data: existing, error: findError } = await db
    .from("pricepulse_payments")
    .select("id, amount")
    .eq("seller_id", sellerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(`getOrCreatePendingPayment find: ${findError.message}`);
  if (existing) return { orderId: existing.id, amount: existing.amount };

  const orderId = `pp-${sellerId.slice(0, 8)}-${Date.now().toString(36)}`;
  const { error: insertError } = await db.from("pricepulse_payments").insert({
    id: orderId,
    seller_id: sellerId,
    amount: PRO_PRICE_KRW,
    status: "pending",
    plan: "pro",
  });
  if (insertError) throw new Error(`getOrCreatePendingPayment insert: ${insertError.message}`);

  return { orderId, amount: PRO_PRICE_KRW };
}

export type OrderRecord = { sellerId: string; amount: number; status: string };

export async function getPayment(orderId: string): Promise<OrderRecord | null> {
  const { data, error } = await client()
    .from("pricepulse_payments")
    .select("seller_id, amount, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`getPayment: ${error.message}`);
  if (!data) return null;
  return { sellerId: data.seller_id, amount: data.amount, status: data.status };
}

/** Marks the order paid and extends the seller's Pro plan by PRO_DURATION_DAYS from today. */
export async function markPaidAndUpgrade(orderId: string, paymentKey: string, sellerId: string): Promise<void> {
  const db = client();
  const expiresAt = new Date(Date.now() + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: paymentError } = await db
    .from("pricepulse_payments")
    .update({ status: "paid", payment_key: paymentKey, paid_at: new Date().toISOString() })
    .eq("id", orderId);
  if (paymentError) throw new Error(`markPaidAndUpgrade payment: ${paymentError.message}`);

  const { error: sellerError } = await db
    .from("pricepulse_sellers")
    .update({ plan: "pro", plan_expires_at: expiresAt })
    .eq("id", sellerId);
  if (sellerError) throw new Error(`markPaidAndUpgrade seller: ${sellerError.message}`);
}
