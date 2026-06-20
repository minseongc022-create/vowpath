import { NextResponse } from "next/server";
import { getIntakeState, saveIntakeState } from "@/lib/call-intake/state-store";
import { updateCallLogRecording } from "@/lib/call-logs";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { logOperationFailure } from "@/lib/ops-failures";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (process.env.NODE_ENV === "production" && !validateTwilioWebhook(request, rawBody)) {
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
    const userIdForState = await resolveTenantUserId({ to, callSid });
    const state =
      userIdForState ? await getIntakeState(userIdForState, callSid) : null;
    if (state) {
      state.recordingUrl = recordingUrl;
      if (recordingSid) state.recordingSid = recordingSid;
      await saveIntakeState(state);
      return new NextResponse("", { status: 204 });
    }

    const userId = await resolveTenantUserId({ to, callSid });
    if (!userId) {
      return new NextResponse("", { status: 204 });
    }

    await updateCallLogRecording(userId, callSid, recordingUrl);
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
