import { NextResponse } from "next/server";
import { betaCohortIntroPriceId } from "@/lib/paddle-config";
import { feedbackCohortPriceStepDate } from "@/lib/billing-cohort";
import { createCheckoutSession } from "@/lib/checkout-server";
import { getSession } from "@/lib/session";
import { findUserById, updateUserBilling } from "@/lib/users-db";

const MAX_FEEDBACK_LENGTH = 2000;

/**
 * Trial-ended user submits feedback → unlocks $129/mo for 5 years (vs $189 regular).
 * After 5 years, cron steps subscription to standard unlimited price.
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

  try {
    const checkout = await createCheckoutSession("unlimited", {
      priceIdOverride: betaCohortIntroPriceId(),
      cohort: "beta_feedback",
    });
    return NextResponse.json({
      transactionId: checkout.transactionId,
      url: checkout.url,
    });
  } catch (e) {
    console.error("[feedback/submit] checkout", e);
    return NextResponse.json(
      { error: "체크아웃을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
