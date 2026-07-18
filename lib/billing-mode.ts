import {
  resolvePaddleClientEnvironment,
  resolvePaddleClientToken,
} from "./paddle-client-public";
import { isPaddleConfigured, isValidPaddleEnvValue } from "./paddle-config";

/** Build-time flag from NEXT_PUBLIC_BETA (baked into client bundle). */
export function isPublicBetaBuild(): boolean {
  return process.env.NEXT_PUBLIC_BETA === "true";
}

/**
 * Server runtime checkout gate.
 * Priority: BILLING_ENABLED override → production + Paddle configured → !NEXT_PUBLIC_BETA.
 */
export function isPaidCheckoutEnabled(): boolean {
  const override = process.env.BILLING_ENABLED?.trim().toLowerCase();
  if (override === "true" || override === "1" || override === "yes") return true;
  if (override === "false" || override === "0" || override === "no") return false;

  const paddleLive =
    isValidPaddleEnvValue(process.env.PADDLE_API_KEY) &&
    (isPaddleConfigured("pro") || isPaddleConfigured("flex"));

  if (paddleLive && process.env.VERCEL_ENV === "production") {
    return true;
  }

  return !isPublicBetaBuild();
}

export function paddleClientTokenConfigured(): boolean {
  return Boolean(resolvePaddleClientToken());
}

export type CheckoutReadiness = {
  checkoutEnabled: boolean;
  mode: "beta" | "not_configured" | "paddle_checkout_disabled" | "ready";
  paddleConfigured: boolean;
  clientTokenConfigured: boolean;
  /** Runtime Paddle.js token (public by design) when configured server-side. */
  paddleClientToken?: string;
  paddleEnvironment?: "production" | "sandbox";
  issues: string[];
};

export function getCheckoutReadiness(paddleErrorCode?: string | null): CheckoutReadiness {
  const issues: string[] = [];
  const paddleConfigured =
    isPaddleConfigured("pro") || isPaddleConfigured("flex");
  const clientTokenConfigured = paddleClientTokenConfigured();
  const checkoutEnabled = isPaidCheckoutEnabled();

  if (!checkoutEnabled) {
    issues.push(
      "Paid checkout is off. Set BILLING_ENABLED=true in Vercel (Production), or redeploy with NEXT_PUBLIC_BETA=false.",
    );
    return {
      checkoutEnabled: false,
      mode: "beta",
      paddleConfigured,
      clientTokenConfigured,
      issues,
    };
  }

  if (!paddleConfigured) {
    issues.push("Paddle API key or price IDs are missing in server environment.");
    return {
      checkoutEnabled: true,
      mode: "not_configured",
      paddleConfigured: false,
      clientTokenConfigured,
      issues,
    };
  }

  if (!clientTokenConfigured) {
    issues.push(
      "Paddle client token is missing — set PADDLE_CLIENT_TOKEN or NEXT_PUBLIC_PADDLE_CLIENT_TOKEN in Vercel (Production).",
    );
  }

  if (paddleErrorCode === "paddle_checkout_disabled") {
    issues.push(
      "Paddle seller onboarding is incomplete — enable Checkout in Paddle dashboard (transaction_checkout_not_enabled).",
    );
    return withPaddleClientPublic({
      checkoutEnabled: true,
      mode: "paddle_checkout_disabled",
      paddleConfigured: true,
      clientTokenConfigured,
      issues,
    });
  }

  if (!clientTokenConfigured) {
    return {
      checkoutEnabled: true,
      mode: "not_configured",
      paddleConfigured: true,
      clientTokenConfigured: false,
      issues,
    };
  }

  return withPaddleClientPublic({
    checkoutEnabled: true,
    mode: "ready",
    paddleConfigured: true,
    clientTokenConfigured: true,
    issues,
  });
}

function withPaddleClientPublic(
  base: Omit<CheckoutReadiness, "paddleClientToken" | "paddleEnvironment">,
): CheckoutReadiness {
  if (!base.clientTokenConfigured) return base;
  return {
    ...base,
    paddleClientToken: resolvePaddleClientToken(),
    paddleEnvironment: resolvePaddleClientEnvironment(),
  };
}
