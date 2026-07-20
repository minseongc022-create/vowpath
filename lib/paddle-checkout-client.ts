import type { PlanId } from "@/lib/constants";

export type CheckoutApiOk = {
  transactionId: string;
  url?: string;
};

export type CheckoutApiErr = {
  error: string;
  code?: string;
};

export type PaddleClientConfig = {
  token: string;
  environment: "production" | "sandbox";
};

type CheckoutStatusPayload = {
  paddleClientToken?: string;
  paddleEnvironment?: "production" | "sandbox";
};

let cachedClientConfig: PaddleClientConfig | null = null;

export function paddleClientToken(): string | undefined {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() || undefined;
}

export function paddleClientEnvironment(): "production" | "sandbox" {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
}

export async function fetchPaddleClientConfig(): Promise<PaddleClientConfig> {
  const buildToken = paddleClientToken();
  if (buildToken) {
    return { token: buildToken, environment: paddleClientEnvironment() };
  }
  if (cachedClientConfig) return cachedClientConfig;

  const res = await fetch("/api/checkout/status");
  const data = (await res.json()) as CheckoutStatusPayload;
  const token = data.paddleClientToken?.trim();
  if (!token) {
    const err = new Error("Paddle client token missing");
    (err as Error & { code?: string }).code = "missing_client_token";
    throw err;
  }

  cachedClientConfig = {
    token,
    environment: data.paddleEnvironment === "production" ? "production" : "sandbox",
  };
  return cachedClientConfig;
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
  const { token, environment } = await fetchPaddleClientConfig();
  const pwCustomerId = await resolvePwCustomerId();

  const { initializePaddle } = await import("@paddle/paddle-js");
  const paddle = await initializePaddle({
    token,
    environment,
    ...(pwCustomerId ? { pwCustomer: { id: pwCustomerId } } : {}),
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

/** Paddle Retain — must be `ctm_…`, never email or our internal user id. */
async function resolvePwCustomerId(): Promise<string | undefined> {
  try {
    const res = await fetch("/api/billing/status");
    if (!res.ok) return undefined;
    const data = (await res.json()) as { paddleCustomerId?: string | null };
    const id = data.paddleCustomerId?.trim();
    return id?.startsWith("ctm_") ? id : undefined;
  } catch {
    return undefined;
  }
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
