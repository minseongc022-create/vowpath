import type { PlanId } from "@/lib/constants";

export type CheckoutApiOk = {
  transactionId: string;
  url?: string;
};

export type CheckoutApiErr = {
  error: string;
  code?: string;
};

export function paddleClientToken(): string | undefined {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() || undefined;
}

export function paddleClientEnvironment(): "production" | "sandbox" {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
}

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
  if (!data.transactionId) {
    const err = new Error("Missing transaction id");
    (err as Error & { code?: string }).code = "missing_transaction";
    throw err;
  }
  return data;
}

export async function openPaddleCheckout(transactionId: string): Promise<void> {
  const token = paddleClientToken();
  if (!token) {
    const err = new Error("Paddle client token missing");
    (err as Error & { code?: string }).code = "missing_client_token";
    throw err;
  }

  const { initializePaddle } = await import("@paddle/paddle-js");
  const paddle = await initializePaddle({
    token,
    environment: paddleClientEnvironment(),
  });
  if (!paddle) {
    const err = new Error("Paddle.js failed to load");
    (err as Error & { code?: string }).code = "unavailable";
    throw err;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://effiroad.com";
  paddle.Checkout.open({
    transactionId,
    settings: {
      successUrl: `${origin}/dashboard/settings?transaction_id=${encodeURIComponent(transactionId)}`,
    },
  });
}

export async function startPlanCheckout(plan: PlanId): Promise<void> {
  const session = await createCheckoutSession(plan);
  try {
    await openPaddleCheckout(session.transactionId);
  } catch (e) {
    if (session.url && typeof window !== "undefined") {
      window.location.href = session.url;
      return;
    }
    throw e;
  }
}
