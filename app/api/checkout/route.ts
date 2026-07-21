import { NextResponse } from "next/server";
import { isPaidCheckoutEnabled } from "@/lib/billing-mode";
import { DEFAULT_PLAN, ROUTES, SITE } from "@/lib/constants";
import {
  CheckoutUnavailableError,
  createCheckoutSession,
  getCheckoutRedirectUrl,
  parsePlanId,
} from "@/lib/checkout-server";

function planFromRequest(request: Request): ReturnType<typeof parsePlanId> {
  const { searchParams } = new URL(request.url);
  try {
    return parsePlanId(searchParams.get("plan"));
  } catch {
    return DEFAULT_PLAN;
  }
}

async function planFromBody(request: Request): Promise<ReturnType<typeof parsePlanId>> {
  try {
    const body = await request.json();
    return parsePlanId(body?.plan);
  } catch {
    return DEFAULT_PLAN;
  }
}

/** POST — create Lemon Squeezy checkout; client redirects to checkout URL. */
export async function POST(request: Request) {
  if (!isPaidCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Checkout disabled in beta mode.", code: "beta" },
      { status: 503 },
    );
  }

  const plan = await planFromBody(request);
  try {
    const session = await createCheckoutSession(plan);
    return NextResponse.json({
      checkoutId: session.checkoutId,
      url: session.url,
    });
  } catch (e) {
    if (e instanceof CheckoutUnavailableError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 503 });
    }
    console.error("[checkout]", e);
    return NextResponse.json(
      {
        error: `We couldn't start ${SITE.name} checkout. Please try again in a moment.`,
        code: "unavailable",
      },
      { status: 500 },
    );
  }
}

/** Browser link — redirects to Lemon Squeezy checkout or signup fallback. */
export async function GET(request: Request) {
  if (!isPaidCheckoutEnabled()) {
    return NextResponse.redirect(new URL(ROUTES.signup, request.url));
  }
  const plan = planFromRequest(request);
  try {
    const url = await getCheckoutRedirectUrl(plan);
    return NextResponse.redirect(url);
  } catch (e) {
    const code =
      e instanceof CheckoutUnavailableError ? e.code : "failed";
    return NextResponse.redirect(
      new URL(`/get-started?checkout_error=${encodeURIComponent(code)}&plan=${plan}`, request.url),
    );
  }
}
