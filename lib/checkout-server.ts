import { DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";
import {
  allowCheckoutFallback,
  isValidLsEnvValue,
  variantIdForPlan,
} from "@/lib/lemon-squeezy-config";
import { LemonSqueezyApiError, lsFetch } from "@/lib/lemon-squeezy-client";

export class CheckoutUnavailableError extends Error {
  code: string;

  constructor(message = "Could not start checkout.", code = "unavailable") {
    super(message);
    this.name = "CheckoutUnavailableError";
    this.code = code;
  }
}

export type CheckoutSession = {
  checkoutId: string;
  url: string;
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

type LsCheckoutResponse = {
  data: { id: string; attributes: { url: string } };
};

/** Lemon Squeezy checkout · (dev) signup fallback when LS env missing */
export async function createCheckoutSession(
  plan: PlanId,
  opts?: {
    variantIdOverride?: string;
    cohort?: "beta_feedback";
    email?: string;
    name?: string;
  },
): Promise<CheckoutSession> {
  const variantId = opts?.variantIdOverride ?? variantIdForPlan(plan);
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const configured =
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY) &&
    isValidLsEnvValue(storeId) &&
    isValidLsEnvValue(variantId);

  if (!configured) {
    if (allowCheckoutFallback()) {
      const signup = new URL(ROUTES.signup, appUrl());
      signup.searchParams.set("plan", plan);
      return { checkoutId: "", url: signup.toString() };
    }
    throw new CheckoutUnavailableError(
      "Checkout is still being set up. Please try again shortly.",
      "not_configured",
    );
  }

  try {
    const result = await lsFetch<LsCheckoutResponse>("/checkouts", {
      method: "POST",
      body: {
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: opts?.email,
              name: opts?.name,
              custom: {
                plan,
                ...(opts?.cohort ? { cohort: opts.cohort } : {}),
              },
            },
            product_options: {
              redirect_url: `${appUrl()}/dashboard/settings?checkout=success&plan=${plan}`,
            },
            checkout_options: {
              embed: false,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: storeId!.trim() },
            },
            variant: {
              data: { type: "variants", id: variantId!.trim() },
            },
          },
        },
      },
    });

    const checkoutId = result.data?.id?.trim();
    const url = result.data?.attributes?.url?.trim();
    if (!url) {
      throw new CheckoutUnavailableError(
        "Could not create a checkout session.",
        "missing_checkout",
      );
    }
    return { checkoutId: checkoutId ?? "", url };
  } catch (e) {
    if (e instanceof CheckoutUnavailableError) throw e;
    if (e instanceof LemonSqueezyApiError) {
      console.error("[checkout-server] LS checkout FAILED", e.status, e.body);
      throw new CheckoutUnavailableError("Could not start checkout.", "unavailable");
    }
    console.error("[checkout-server] checkout failed", e);
    throw new CheckoutUnavailableError("Could not start checkout.", "unavailable");
  }
}

export async function getCheckoutRedirectUrl(
  plan: PlanId,
  opts?: Parameters<typeof createCheckoutSession>[1],
): Promise<string> {
  const session = await createCheckoutSession(plan, opts);
  return session.url;
}
