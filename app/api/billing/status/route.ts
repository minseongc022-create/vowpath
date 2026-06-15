import { NextResponse } from "next/server";
import { IS_BETA } from "@/lib/beta";
import { isEntitled, mergeUserBilling, verifyCheckoutSession } from "@/lib/billing";
import { getSession } from "@/lib/session";
import { findUserById, updateUserBilling } from "@/lib/users-db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim();

  let user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (sessionId) {
    const verified = await verifyCheckoutSession(sessionId);
    if (verified.ok) {
      user =
        (await updateUserBilling(session.sub, {
          plan: verified.plan,
          stripeCustomerId: verified.customerId,
          stripeSubscriptionId: verified.subscriptionId,
          subscriptionStatus: "active",
          paidAt: new Date().toISOString(),
        })) ?? user;
    }
  }

  const billing = mergeUserBilling(user);
  return NextResponse.json({
    beta: IS_BETA,
    entitled: isEntitled(user),
    plan: billing.plan ?? null,
    subscriptionStatus: billing.subscriptionStatus ?? "none",
    flexBillableCount: billing.flexBillableCount ?? 0,
    stripeCustomerId: billing.stripeCustomerId ?? null,
    paidAt: billing.paidAt ?? null,
  });
}
