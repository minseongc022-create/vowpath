import { NextResponse } from "next/server";
import { getIntakeState, saveIntakeState } from "@/lib/call-intake/state-store";
import { retranscribeCallWithDeepgram } from "@/lib/call-intake/deepgram-retranscribe";
import { updateCallLogRecording } from "@/lib/call-logs";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isTenantProductEntitled } from "@/lib/tenant-product-access";
import { logOperationFailure } from "@/lib/ops-failures";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const form = new URLSearchParams(rawBody);
  const callSid = form.get("CallSid")?.trim() ?? "";
  const recordingUrl = form.get("RecordingUrl")?.trim();
  const recordingStatus = form.get("RecordingStatus")?.trim();
  const to = form.get("To") ?? "";

  if (!callSid || recordingStatus !== "completed" || !recordingUrl) {
    return new NextResponse("", { status: 204 });
  }

  const recordingSid = form.get("RecordingSid")?.trim();

  try {
    const userId = await resolveTenantUserId({ to, callSid });
    if (!userId) {
      return new NextResponse("", { status: 204 });
    }

    if (!(await isTenantProductEntitled(userId))) {
      return new NextResponse("", { status: 204 });
    }

    const state = await getIntakeState(userId, callSid);
    if (state) {
      state.recordingUrl = recordingUrl;
      if (recordingSid) state.recordingSid = recordingSid;
      await saveIntakeState(state);
    } else {
      await updateCallLogRecording(userId, callSid, recordingUrl);
    }

    await retranscribeCallWithDeepgram({ userId, callSid, recordingUrl });
  } catch (e) {
    await logOperationFailure({
      category: "twilio",
      operation: "recordingCallback",
      message: e instanceof Error ? e.message : "Recording attach failed",
      retryable: true,
      callSid,
    });
  }

  return new NextResponse("", { status: 204 });
}
