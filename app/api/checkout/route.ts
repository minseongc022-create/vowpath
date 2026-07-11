import { NextResponse } from "next/server";
import { IS_BETA } from "@/lib/beta";
import { ROUTES, SITE } from "@/lib/constants";
import {
  CheckoutUnavailableError,
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

async function handleCheckout(plan: ReturnType<typeof parsePlanId>) {
  try {
    const url = await getCheckoutRedirectUrl(plan);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof CheckoutUnavailableError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error("[checkout]", e);
    return NextResponse.json(
      {
        error: `We couldn't start ${SITE.name} checkout. Please try again in a moment.`,
      },
      { status: 500 },
    );
  }
}

/** Browser link — redirects straight to Paddle checkout or signup. */
export async function GET(request: Request) {
  if (IS_BETA) {
    return NextResponse.redirect(new URL(ROUTES.signup, request.url));
  }
  const plan = planFromRequest(request);
  try {
    const url = await getCheckoutRedirectUrl(plan);
    return NextResponse.redirect(url);
  } catch (e) {
    const message =
      e instanceof CheckoutUnavailableError
        ? "unavailable"
        : "failed";
    // Temporary diagnostic: surface the underlying Paddle reason in the URL so
    // it can be read without server-log access. Safe to remove once live.
    const detail =
      e instanceof Error ? encodeURIComponent(e.message.slice(0, 200)) : "";
    return NextResponse.redirect(
      new URL(`/get-started?checkout_error=${message}&plan=${plan}&d=${detail}`, request.url),
    );
  }
}

export async function POST(request: Request) {
  const plan = await planFromBody(request);
  return handleCheckout(plan);
}
