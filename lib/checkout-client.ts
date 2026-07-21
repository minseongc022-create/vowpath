"use client";

import type { PlanId } from "@/lib/constants";

export type CheckoutApiOk = {
  checkoutId: string;
  url: string;
};

export type CheckoutApiErr = {
  error: string;
  code?: string;
};

export async function createCheckoutSession(plan: PlanId): Promise<CheckoutApiOk> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = (await res.json()) as CheckoutApiOk & CheckoutApiErr;
  if (!res.ok) {
    const err = new Error(data.error || "Checkout failed");
    (err as Error & { code?: string }).code = data.code;
    throw err;
  }
  if (!data.url) {
    const err = new Error("Missing checkout URL");
    (err as Error & { code?: string }).code = "missing_checkout";
    throw err;
  }
  return data;
}

export async function startPlanCheckout(plan: PlanId): Promise<void> {
  const session = await createCheckoutSession(plan);
  window.location.href = session.url;
}

/** Redirect to Lemon Squeezy checkout URL (legacy name for call sites). */
export async function openCheckoutUrl(url: string): Promise<void> {
  window.location.href = url;
}
