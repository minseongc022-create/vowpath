import { NextResponse } from "next/server";
import { IS_BETA } from "@/lib/beta";
import { isEntitled, mergeUserBilling, verifyTransaction } from "@/lib/billing";
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
  const transactionId = url.searchParams.get("transaction_id")?.trim();

  let user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (transactionId) {
    const verified = await verifyTransaction(transactionId);
    if (verified.ok) {
      user =
        (await updateUserBilling(session.sub, {
          plan: verified.plan,
          paddleCustomerId: verified.customerId,
          paddleSubscriptionId: verified.subscriptionId,
          subscriptionStatus: "active",
          paidAt: new Date().toISOString(),
        })) ?? user;
    }
  }

  const billing = mergeUserBilling(user);
  const usage = buildBillingUsageSummary(user);
  return NextResponse.json({
    beta: IS_BETA,
    entitled: isEntitled(user),
    plan: billing.plan ?? null,
    planLabel: planDisplayName(billing.plan),
    subscriptionStatus: billing.subscriptionStatus ?? "none",
    flexBillableCount: billing.flexBillableCount ?? 0,
    usage,
    paddleCustomerId: billing.paddleCustomerId ?? null,
    paidAt: billing.paidAt ?? null,
    trialEndsAt: billing.trialEndsAt ?? null,
  });
}
