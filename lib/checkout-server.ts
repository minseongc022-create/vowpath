import { DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";
import { paddleErrorToCode } from "@/lib/checkout-errors";
import {
  allowCheckoutFallback,
  isValidPaddleEnvValue,
  priceIdForPlan,
} from "@/lib/paddle-config";
import { PaddleApiError, paddleFetch } from "@/lib/paddle-client";

export class CheckoutUnavailableError extends Error {
  code: string;

  constructor(message = "Could not start checkout.", code = "unavailable") {
    super(message);
    this.name = "CheckoutUnavailableError";
    this.code = code;
  }
}

export type CheckoutSession = {
  transactionId: string;
  url?: string;
};

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function parsePlanId(value: unknown): PlanId {
  return normalizePlanId(value);
}

type PaddleTransactionResponse = {
  data: { id: string; checkout?: { url?: string } };
};

/** Paddle Checkout session · (dev) signup fallback when Paddle env missing */
export async function createCheckoutSession(
  plan: PlanId,
  opts?: {
    /** Use this price instead of the plan's normal price (e.g. the $129 beta-feedback intro rate). */
    priceIdOverride?: string;
    /** Tagged onto the transaction's custom_data so the webhook can mark the user's cohort. */
    cohort?: "beta_feedback";
  },
): Promise<CheckoutSession> {
  const priceId = opts?.priceIdOverride ?? priceIdForPlan(plan);
  const configured =
    isValidPaddleEnvValue(process.env.PADDLE_API_KEY) && isValidPaddleEnvValue(priceId);

  if (!configured) {
    if (allowCheckoutFallback()) {
      const signup = new URL(ROUTES.signup, appUrl());
      signup.searchParams.set("plan", plan);
      return { transactionId: "", url: signup.toString() };
    }
    throw new CheckoutUnavailableError(
      "Checkout is still being set up. Please try again shortly.",
      "not_configured",
    );
  }

  try {
    const result = await paddleFetch<PaddleTransactionResponse>("/transactions", {
      method: "POST",
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { plan, cohort: opts?.cohort },
        collection_mode: "automatic",
      },
    });

    const transactionId = result.data?.id?.trim();
    const url = result.data?.checkout?.url;
    if (!transactionId) {
      throw new CheckoutUnavailableError(
        "Could not create a checkout session.",
        "missing_transaction",
      );
    }
    return { transactionId, url };
  } catch (e) {
    if (e instanceof CheckoutUnavailableError) throw e;
    if (e instanceof PaddleApiError) {
      const code = paddleErrorToCode(e.body);
      console.error("[checkout-server] paddle transaction FAILED", e.status, e.body);
      throw new CheckoutUnavailableError(
        code === "paddle_checkout_disabled"
          ? "Paddle checkout is not enabled on this account yet."
          : "Could not start checkout.",
        code,
      );
    }
    console.error("[checkout-server] checkout failed", e);
    throw new CheckoutUnavailableError("Could not start checkout.", "unavailable");
  }
}

/** @deprecated Prefer createCheckoutSession + Paddle.js overlay */
export async function getCheckoutRedirectUrl(
  plan: PlanId,
  opts?: Parameters<typeof createCheckoutSession>[1],
): Promise<string> {
  const session = await createCheckoutSession(plan, opts);
  if (session.url) return session.url;
  if (session.transactionId) {
    const pay = new URL("/pay", appUrl());
    pay.searchParams.set("_ptxn", session.transactionId);
    return pay.toString();
  }
  throw new CheckoutUnavailableError("Could not create a checkout URL.", "missing_transaction");
}
