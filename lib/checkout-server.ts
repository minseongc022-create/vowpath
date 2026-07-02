import { ROUTES, type PlanId } from "@/lib/constants";
import {
  allowCheckoutFallback,
  isValidPaddleEnvValue,
  priceIdForPlan,
} from "@/lib/paddle-config";
import { paddleFetch } from "@/lib/paddle-client";

export class CheckoutUnavailableError extends Error {
  constructor(message = "결제를 시작할 수 없습니다.") {
    super(message);
    this.name = "CheckoutUnavailableError";
  }
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function parsePlanId(value: unknown): PlanId {
  return value === "flex" ? "flex" : "unlimited";
}

type PaddleTransactionResponse = {
  data: { id: string; checkout?: { url?: string } };
};

/** Paddle Checkout · (개발) 회원가입 폴백 URL */
export async function getCheckoutRedirectUrl(
  plan: PlanId,
  opts?: {
    /** Use this price instead of the plan's normal price (e.g. the $129 beta-feedback intro rate). */
    priceIdOverride?: string;
    /** Tagged onto the transaction's custom_data so the webhook can mark the user's cohort. */
    cohort?: "beta_feedback";
  },
): Promise<string> {
  const priceId = opts?.priceIdOverride ?? priceIdForPlan(plan);
  const configured =
    isValidPaddleEnvValue(process.env.PADDLE_API_KEY) && isValidPaddleEnvValue(priceId);

  if (!configured) {
    if (allowCheckoutFallback()) {
      const signup = new URL(ROUTES.signup, appUrl());
      signup.searchParams.set("plan", plan);
      return signup.toString();
    }
    throw new CheckoutUnavailableError(
      "결제 시스템을 준비 중입니다. 잠시 후 다시 시도해 주세요.",
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

    const url = result.data?.checkout?.url;
    if (!url) {
      throw new CheckoutUnavailableError("Checkout URL을 생성하지 못했습니다.");
    }
    return url;
  } catch (e) {
    if (e instanceof CheckoutUnavailableError) throw e;
    console.error("[checkout-server] paddle transaction", e);
    throw new CheckoutUnavailableError("Checkout URL을 생성하지 못했습니다.");
  }
}
