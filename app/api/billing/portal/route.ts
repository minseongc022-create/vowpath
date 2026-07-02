import { NextResponse } from "next/server";
import { createBillingPortalUrl, mergeUserBilling } from "@/lib/billing";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/users-db";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const billing = mergeUserBilling(user);
  if (!billing.paddleSubscriptionId) {
    return NextResponse.json({ error: "No billing account" }, { status: 400 });
  }

  const url = await createBillingPortalUrl(billing.paddleSubscriptionId);
  if (!url) {
    return NextResponse.json({ error: "Portal unavailable" }, { status: 503 });
  }

  return NextResponse.json({ url });
}
