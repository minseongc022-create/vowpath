import { NextResponse } from "next/server";
import { betaCohortIntroPriceId } from "@/lib/paddle-config";
import { getCheckoutRedirectUrl } from "@/lib/checkout-server";
import { getSession } from "@/lib/session";
import { findUserById, updateUserBilling } from "@/lib/users-db";

const MAX_FEEDBACK_LENGTH = 2000;

/**
 * Called when a trial-expired user submits the one-line feedback prompt. Unlocks the
 * $129/mo intro rate (steps to $159/mo lifetime after 6 months — see
 * api/cron/beta-cohort-price-step) and returns the Paddle checkout URL for it.
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
  const priceStepAt = new Date(now);
  priceStepAt.setMonth(priceStepAt.getMonth() + 6);

  await updateUserBilling(user.id, {
    feedbackText: text.slice(0, MAX_FEEDBACK_LENGTH),
    feedbackSubmittedAt: now.toISOString(),
    discountCohort: "beta_feedback",
    betaCohortPriceStepAt: priceStepAt.toISOString(),
  });

  try {
    const url = await getCheckoutRedirectUrl("unlimited", {
      priceIdOverride: betaCohortIntroPriceId(),
      cohort: "beta_feedback",
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[feedback/submit] checkout", e);
    return NextResponse.json(
      { error: "체크아웃을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
