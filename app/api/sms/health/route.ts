import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSmsTwilioHealthForUser } from "@/lib/sms-twilio-health";
import { probeTwilioSmsDelivery } from "@/lib/sms-twilio-probe";
import { smsDevPreviewEnabled } from "@/lib/send-sms";
import {
  isKrSmsTestMode,
  isOwnerContactCompleteForSms,
  normalizeOwnerAlertPhone,
} from "@/lib/sms-region-config";
import { isKrOwnerPhoneEmail } from "@/lib/owner-phone-policy";
import { findUserById } from "@/lib/users-db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const health = await getSmsTwilioHealthForUser(session.sub);
  const user = await findUserById(session.sub);
  const ownerPhoneOk = user?.phone
    ? normalizeOwnerAlertPhone(user.phone, user.email)
    : null;

  const url = new URL(request.url);
  const runProbe =
    url.searchParams.get("probe") === "1" &&
    health.ready &&
    !smsDevPreviewEnabled();

  const probe = runProbe ? await probeTwilioSmsDelivery() : null;

  return NextResponse.json({
    ...health,
    devPreview: smsDevPreviewEnabled(),
    krTestMode:
      isKrSmsTestMode() ||
      (user?.email ? isKrOwnerPhoneEmail(user.email) : false),
    productionUsOnly: process.env.NODE_ENV === "production",
    ownerPhoneOk: Boolean(ownerPhoneOk),
    ownerContactComplete: user ? isOwnerContactCompleteForSms(user) : false,
    ownerPhoneIssue: user?.phone?.trim() && !ownerPhoneOk ? "invalid_phone" : null,
    probe,
    readyForProduction:
      process.env.NODE_ENV === "production" &&
      health.ready &&
      !smsDevPreviewEnabled() &&
      Boolean(ownerPhoneOk) &&
      (probe?.ok ?? false),
  });
}
