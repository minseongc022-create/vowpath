import type { PlanId } from "@/lib/constants";
import { isAnyLsPlanConfigured, isValidLsEnvValue } from "@/lib/lemon-squeezy-config";

/** Build-time flag from NEXT_PUBLIC_BETA (baked into client bundle). */
export function isPublicBetaBuild(): boolean {
  return process.env.NEXT_PUBLIC_BETA === "true";
}

/**
 * Server runtime checkout gate.
 * Priority: BILLING_ENABLED override → production + LS configured → !NEXT_PUBLIC_BETA.
 */
export function isPaidCheckoutEnabled(): boolean {
  const override = process.env.BILLING_ENABLED?.trim().toLowerCase();
  if (override === "true" || override === "1" || override === "yes") return true;
  if (override === "false" || override === "0" || override === "no") return false;

  const lsLive = isAnyLsPlanConfigured();

  if (lsLive && process.env.VERCEL_ENV === "production") {
    return true;
  }

  return !isPublicBetaBuild();
}

export type CheckoutReadiness = {
  checkoutEnabled: boolean;
  mode: "beta" | "not_configured" | "ready";
  billingConfigured: boolean;
  issues: string[];
};

export function getCheckoutReadiness(): CheckoutReadiness {
  const issues: string[] = [];
  const billingConfigured = isAnyLsPlanConfigured();
  const checkoutEnabled = isPaidCheckoutEnabled();

  if (!checkoutEnabled) {
    issues.push(
      "Paid checkout is off. Set BILLING_ENABLED=true in Vercel (Production), or redeploy with NEXT_PUBLIC_BETA=false.",
    );
    return {
      checkoutEnabled: false,
      mode: "beta",
      billingConfigured,
      issues,
    };
  }

  if (!isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY)) {
    issues.push("LEMON_SQUEEZY_API_KEY is missing in server environment.");
  }
  if (!isValidLsEnvValue(process.env.LEMON_SQUEEZY_STORE_ID)) {
    issues.push("LEMON_SQUEEZY_STORE_ID is missing — copy from Lemon Squeezy Settings → Stores.");
  }

  if (!billingConfigured) {
    issues.push(
      "No plan variant IDs configured yet. Add LEMON_SQUEEZY_VARIANT_ID_* in Vercel after creating products in Lemon Squeezy.",
    );
    return {
      checkoutEnabled: true,
      mode: "not_configured",
      billingConfigured: false,
      issues,
    };
  }

  return {
    checkoutEnabled: true,
    mode: "ready",
    billingConfigured: true,
    issues,
  };
}

/** @deprecated use billingConfigured */
export function isAnyPaddlePlanConfigured(): boolean {
  return isAnyLsPlanConfigured();
}
