import { NextResponse } from "next/server";
import {
  betaCohortFlexIntroPriceId,
  betaCohortIntroPriceId,
} from "@/lib/paddle-config";
import { feedbackCohortPriceStepDate } from "@/lib/billing-cohort";
import { createCheckoutSession, parsePlanId } from "@/lib/checkout-server";
import { getSession } from "@/lib/session";
import { findUserById, updateUserBilling } from "@/lib/users-db";

const MAX_FEEDBACK_LENGTH = 2000;

/**
 * Trial-ended user submits feedback → unlocks founder pricing for 5 years:
 * Unlimited $129/mo or Flex $40/mo + $9/dispatch (vs regular rates).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const plan = parsePlanId(body?.plan);
  if (!text) {
    return NextResponse.json({ error: "Feedback text required" }, { status: 400 });
  }

  const now = new Date();
  const priceStepAt = feedbackCohortPriceStepDate(now);

  await updateUserBilling(user.id, {
    feedbackText: text.slice(0, MAX_FEEDBACK_LENGTH),
    feedbackSubmittedAt: now.toISOString(),
    discountCohort: "beta_feedback",
    betaCohortPriceStepAt: priceStepAt.toISOString(),
  });

  const priceIdOverride =
    plan === "flex" ? betaCohortFlexIntroPriceId() : betaCohortIntroPriceId();

  try {
    const checkout = await createCheckoutSession(plan, {
      priceIdOverride,
      cohort: "beta_feedback",
    });
    return NextResponse.json({
      transactionId: checkout.transactionId,
      url: checkout.url,
      plan,
    });
  } catch (e) {
    console.error("[feedback/submit] checkout", e);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again shortly." },
      { status: 500 },
    );
  }
}
