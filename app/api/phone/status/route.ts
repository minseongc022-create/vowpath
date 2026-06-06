import { NextResponse } from "next/server";
import {
  getTwilioDefaultUserId,
  getTwilioWebhookBaseUrl,
  isTwilioConfigured,
} from "@/lib/twilio-config";
import { getTenantPhoneRecord } from "@/lib/tenant-phone-store";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phoneNumber = await getTenantTwilioPhone(session.sub);
  const record = await getTenantPhoneRecord(session.sub);

  return NextResponse.json({
    twilioConfigured: isTwilioConfigured(),
    phoneNumber,
    phoneProvisioned: Boolean(phoneNumber),
    phoneLegacy: Boolean(record?.legacy),
    provisionedAt: record?.provisionedAt ?? null,
    webhookBase: getTwilioWebhookBaseUrl(),
    defaultUserSet: Boolean(getTwilioDefaultUserId()),
  });
}
