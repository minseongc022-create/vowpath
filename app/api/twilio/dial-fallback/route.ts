import { NextResponse } from "next/server";
import { intakeUrlForMenu } from "@/lib/call-intake/intake-twiml";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import {
  twimlGatherSpeechDetailed,
  twimlResponse,
} from "@/lib/twilio-xml";
import { voicePhoneIntakeIntro, voicePhoneIntakePrompt } from "@/lib/voice-copy";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/**
 * Runs after a <Dial> forward to the Retell agent finishes. If the forward
 * connected and ran normally (DialCallStatus "completed"), the call is already
 * over — end quietly. If it FAILED to connect at all ("failed", "busy",
 * "no-answer", "canceled"), the caller is still on the line, so we seamlessly
 * hand them to the built-in scripted speech intake instead of hanging up.
 * This guarantees the phone never dead-ends even when the Retell/PSTN forward
 * is rejected — the exact "answered then immediately hung up" symptom.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  if (!validateTwilioWebhook(request, rawBody)) {
    // Fail open to the scripted intake rather than dropping the caller.
    return twimlXml(scriptedIntake(afterHours));
  }

  const form = new URLSearchParams(rawBody);
  const dialStatus = (form.get("DialCallStatus") ?? "").toLowerCase();
  const dialDuration = Number(form.get("DialCallDuration") ?? "0");

  // Normal end after a connected Retell conversation.
  if (dialStatus === "completed" && dialDuration > 0) {
    return twimlXml(twimlResponse(""));
  }

  // Instant reject / zero-duration bridge — treat like a failed forward.
  if (dialStatus === "completed" && dialDuration <= 0) {
    console.warn(
      "[twilio/dial-fallback] Retell SIP/PSTN bridge completed with 0s duration — using scripted intake",
    );
    return twimlXml(scriptedIntake(afterHours));
  }

  // failed / busy / no-answer / canceled → the forward never bridged.
  console.warn(
    `[twilio/dial-fallback] Retell bridge did not connect (DialCallStatus=${dialStatus}); using scripted intake`,
  );
  return twimlXml(scriptedIntake(afterHours));
}

function scriptedIntake(afterHours: boolean): string {
  const gatherUrl = intakeUrlForMenu("P2", afterHours);
  return twimlResponse(
    twimlGatherSpeechDetailed(gatherUrl, voicePhoneIntakeIntro, voicePhoneIntakePrompt),
  );
}
