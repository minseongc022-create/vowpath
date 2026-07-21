import { NextResponse } from "next/server";
import {
  betaCohortLockedVariantIdForPlan,
  variantIdForPlan,
} from "@/lib/lemon-squeezy-config";
import type { PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";
import { billingSubscriptionId } from "@/lib/billing";
import { updateSubscriptionVariant } from "@/lib/lemon-squeezy-client";
import { listUsers, updateUserBilling } from "@/lib/users-db";

/**
 * Daily: steps beta_feedback cohort to regular pricing after 5 years.
 * Idempotent via betaCohortSteppedAt.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isDeployed && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const header = request.headers.get("x-cron-secret");
    if (bearer !== secret && header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = Date.now();
    const users = await listUsers();
    const due = users.filter(
      (u) =>
        u.discountCohort === "beta_feedback" &&
        !u.betaCohortSteppedAt &&
        u.betaCohortPriceStepAt &&
        new Date(u.betaCohortPriceStepAt).getTime() <= now &&
        u.subscriptionStatus === "active" &&
        billingSubscriptionId(u),
    );

    let stepped = 0;
    let failed = 0;
    for (const user of due) {
      const plan: PlanId = normalizePlanId(user.plan);
      const lockedVariantId =
        betaCohortLockedVariantIdForPlan(plan) ?? variantIdForPlan(plan);
      const subscriptionId = billingSubscriptionId(user);

      if (!lockedVariantId || !subscriptionId) {
        failed += 1;
        continue;
      }

      try {
        await updateSubscriptionVariant(subscriptionId, lockedVariantId);
        await updateUserBilling(user.id, {
          betaCohortSteppedAt: new Date().toISOString(),
        });
        stepped += 1;
      } catch (e) {
        console.error("[cron/beta-cohort-price-step]", user.id, e);
        failed += 1;
      }
    }

    return NextResponse.json({ ok: true, checked: due.length, stepped, failed });
  } catch (e) {
    console.error("[cron/beta-cohort-price-step]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
