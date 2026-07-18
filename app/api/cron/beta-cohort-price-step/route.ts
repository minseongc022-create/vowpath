import { NextResponse } from "next/server";
import {
  betaCohortLockedPriceIdForPlan,
  priceIdForPlan,
} from "@/lib/paddle-config";
import type { PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";
import { paddleFetch } from "@/lib/paddle-client";
import { listUsers, updateUserBilling } from "@/lib/users-db";

/**
 * Daily: steps beta_feedback cohort to regular pricing after 5 years.
 * Unlimited → $169/mo. Flex → $75/mo. Lite → $42/mo (usage billed separately).
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
        u.paddleSubscriptionId,
    );

    let stepped = 0;
    let failed = 0;
    for (const user of due) {
      const plan: PlanId = normalizePlanId(user.plan);
      const lockedPriceId =
        betaCohortLockedPriceIdForPlan(plan) ?? priceIdForPlan(plan);

      if (!lockedPriceId) {
        failed += 1;
        continue;
      }

      try {
        await paddleFetch(`/subscriptions/${user.paddleSubscriptionId}`, {
          method: "PATCH",
          body: {
            items: [{ price_id: lockedPriceId, quantity: 1 }],
            proration_billing_mode: "full_next_billing_period",
          },
        });
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
