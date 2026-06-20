import { NextResponse } from "next/server";
import { buildFieldTestGuide } from "@/lib/field-test-guide";
import { getPortalBaseUrl } from "@/lib/portal-url";
import { getSession } from "@/lib/session";
import { resolveOwnerAlertPhone } from "@/lib/owner-alert-phone";
import { findUserById } from "@/lib/users-db";

/** Logged-in: returns live test numbers, addresses, and step-by-step flows. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.sub);
  const ownerPhone = (await resolveOwnerAlertPhone(session.sub)) ?? user?.phone ?? undefined;
  const guide = buildFieldTestGuide({
    shopName: user?.shopName,
    shopPhone: process.env.TWILIO_PHONE_NUMBER,
    portalUrl: getPortalBaseUrl(),
    ownerPhone: ownerPhone ?? undefined,
  });

  return NextResponse.json(guide);
}
