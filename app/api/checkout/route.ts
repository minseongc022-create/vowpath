import { NextResponse } from "next/server";
import { IS_BETA } from "@/lib/beta";
import { ROUTES, SITE } from "@/lib/constants";
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
    return "unlimited";
  }
}

async function planFromBody(request: Request): Promise<ReturnType<typeof parsePlanId>> {
  try {
    const body = await request.json();
    return parsePlanId(body?.plan);
  } catch {
    return "unlimited";
  }
}

/** POST — create Paddle transaction; client opens Paddle.js overlay with transactionId. */
export async function POST(request: Request) {
  if (IS_BETA) {
    return NextResponse.json(
      { error: "Checkout disabled in beta mode.", code: "beta" },
      { status: 503 },
    );
  }

  const plan = await planFromBody(request);
  try {
    const session = await createCheckoutSession(plan);
    if (!session.transactionId && session.url) {
      return NextResponse.json({ url: session.url, transactionId: "" });
    }
    return NextResponse.json({
      transactionId: session.transactionId,
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

/** Browser link — redirects to /pay?_ptxn=… or signup (legacy). */
export async function GET(request: Request) {
  if (IS_BETA) {
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
