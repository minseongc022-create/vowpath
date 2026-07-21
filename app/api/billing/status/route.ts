import { NextResponse } from "next/server";
import { IS_BETA } from "@/lib/beta";
import {
  billingSubscriptionId,
  isEntitled,
  mergeUserBilling,
  verifyCheckoutReturn,
} from "@/lib/billing";
import { normalizePlanId } from "@/lib/plan-pricing";
import { planDisplayName } from "@/lib/plan-pricing";
import { getSession } from "@/lib/session";
import { buildBillingUsageSummary } from "@/lib/usage-alerts";
import { findUserById, updateUserBilling } from "@/lib/users-db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get("subscription_id")?.trim();
  const checkoutSuccess = url.searchParams.get("checkout") === "success";
  const planHint = normalizePlanId(url.searchParams.get("plan"));

  let user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (checkoutSuccess && subscriptionId) {
    const verified = await verifyCheckoutReturn({ subscriptionId, planHint });
    if (verified.ok) {
      user =
        (await updateUserBilling(session.sub, {
          plan: verified.plan,
          lsCustomerId: verified.customerId,
          lsSubscriptionId: verified.subscriptionId,
          lsUsageItemId: verified.usageItemId,
          subscriptionStatus: "active",
          paidAt: new Date().toISOString(),
        })) ?? user;
    }
  }

  const billing = mergeUserBilling(user);
  const usage = buildBillingUsageSummary(user);
  const subId = billingSubscriptionId(user);

  return NextResponse.json({
    beta: IS_BETA,
    entitled: isEntitled(user),
    plan: billing.plan ?? null,
    planLabel: planDisplayName(billing.plan),
    subscriptionStatus: billing.subscriptionStatus ?? "none",
    flexBillableCount: billing.flexBillableCount ?? 0,
    usage,
    billingCustomerId: billing.lsCustomerId ?? billing.paddleCustomerId ?? null,
    paidAt: billing.paidAt ?? null,
    trialEndsAt: billing.trialEndsAt ?? null,
    hasBillingAccount: Boolean(subId),
  });
}
