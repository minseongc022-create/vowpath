import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return key;
}

function encodeForm(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    body.set(key, String(value));
  }
  return body.toString();
}

async function stripeFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(params),
  });

  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Stripe API error ${res.status}`);
  }
  return json;
}

export async function stripeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey()}` },
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Stripe API error ${res.status}`);
  }
  return json;
}

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status: string;
  client_reference_id: string | null;
  payment_intent: string | { id: string } | null;
  metadata?: Record<string, string>;
};

export async function createGiuStripeCheckout(input: {
  reservationId: string;
  code: string;
  boxTitle: string;
  amountVnd: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const session = await stripeFetch<StripeCheckoutSession>("/checkout/sessions", {
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.reservationId,
    customer_email: input.customerEmail,
    "metadata[reservationId]": input.reservationId,
    "metadata[giu]": "1",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "vnd",
    "line_items[0][price_data][unit_amount]": input.amountVnd,
    "line_items[0][price_data][product_data][name]": `Giu ${input.boxTitle}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": `구출 코드 ${input.code}`.slice(
      0,
      250,
    ),
  });

  if (!session.url) {
    throw new Error("Stripe checkout URL missing");
  }

  return { url: session.url, sessionId: session.id };
}

export async function retrieveStripeCheckoutSession(
  sessionId: string,
): Promise<StripeCheckoutSession> {
  return stripeGet<StripeCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export function stripePaymentId(session: StripeCheckoutSession): string {
  const pi = session.payment_intent;
  if (typeof pi === "string" && pi) return pi;
  if (pi && typeof pi === "object" && "id" in pi) return pi.id;
  return session.id;
}

export function reservationIdFromStripeSession(session: StripeCheckoutSession): string | null {
  return (
    session.client_reference_id?.trim() ||
    session.metadata?.reservationId?.trim() ||
    null
  );
}

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: { object: StripeCheckoutSession };
};

export function verifyStripeWebhook(
  payload: string,
  signatureHeader: string | null,
): { valid: boolean; event?: StripeWebhookEvent } {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return { valid: false };

  const parts = signatureHeader.split(",").map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return { valid: false };

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const matched = signatures.some((sig) => {
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  });
  if (!matched) return { valid: false };

  try {
    return { valid: true, event: JSON.parse(payload) as StripeWebhookEvent };
  } catch {
    return { valid: false };
  }
}
