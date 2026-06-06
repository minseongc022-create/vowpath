import { NextResponse } from "next/server";
import { getStorageStatus } from "@/lib/storage-status";
import { getSmsTwilioHealth } from "@/lib/sms-twilio-health";
import { smsDevPreviewEnabled } from "@/lib/send-sms";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storage = getStorageStatus();
  const sms = getSmsTwilioHealth();
  return NextResponse.json({
    ...storage,
    smsConfigured: sms.configured,
    smsReady: sms.ready,
    smsIssues: sms.issues,
    smsDevPreview: smsDevPreviewEnabled(),
  });
}
