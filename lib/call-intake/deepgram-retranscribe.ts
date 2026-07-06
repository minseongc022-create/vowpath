import { DeepgramClient } from "@deepgram/sdk";
import { findCallLogByCallSid, patchCallLog } from "../call-logs";
import { getShopVertical } from "../vertical-context.js";
import { logOperationFailure } from "../ops-failures";
import { withRetry } from "../resilience";
import { extractIntakeFromSpeechForVertical } from "./extraction";

async function fetchTwilioRecordingAudio(recordingUrl: string): Promise<Buffer | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) return null;

  const res = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Re-transcribes a completed call recording with Deepgram (higher accuracy than Twilio's
 * live Gather speech recognition), re-runs GPT extraction on the cleaner transcript, and
 * overwrites the call log with the improved result.
 *
 * Best-effort only — never throws. The live call flow has already completed by the time
 * this runs, so failures here must never surface to the caller or affect the booking.
 */
export async function retranscribeCallWithDeepgram(params: {
  userId: string;
  callSid: string;
  recordingUrl: string;
}): Promise<void> {
  const { userId, callSid, recordingUrl } = params;
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) return;

  try {
    const callLog = await findCallLogByCallSid(userId, callSid);
    if (!callLog) return;

    const audio = await fetchTwilioRecordingAudio(recordingUrl);
    if (!audio) return;

    const client = new DeepgramClient({ apiKey });
    // Best-effort re-transcription — on repeated failure we simply keep the Twilio
    // transcript already on the call log (this function never overwrites it on error).
    const result = await withRetry(
      () =>
        client.listen.v1.media.transcribeFile(audio, {
          model: "nova-3",
          language: "en-US",
          detect_language: true,
        }),
      { maxAttempts: 3, delayMs: 1000, backoff: 2 },
    );

    const transcript =
      "results" in result
        ? (result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "").trim()
        : "";
    if (!transcript) return;

    const vertical = await getShopVertical(userId);
    const { draft, confidence } = await extractIntakeFromSpeechForVertical(
      vertical,
      transcript,
      null,
    );

    await patchCallLog(userId, callLog.id, {
      deepgramTranscript: transcript,
      customerName: draft.customerName,
      address: draft.address,
      serviceLocation: draft.serviceLocation,
      issueType: draft.issueType,
      symptom: draft.symptom,
      priority: draft.priority,
      servicePriority: draft.servicePriority,
      priorityReasons: draft.priorityReasons,
      prioritySource: draft.prioritySource,
      arrivalWindow: draft.arrivalWindow,
      dispatchNotes: draft.dispatchNotes,
      jobberPasteBlock: draft.jobberPasteBlock,
      lossCategory: draft.lossCategory,
      insuranceCarrier: draft.insuranceCarrier,
      insuranceClaimNumber: draft.insuranceClaimNumber,
      waterSource: draft.waterSource,
      activeLoss: draft.activeLoss,
      confidence,
    });
  } catch (e) {
    await logOperationFailure({
      userId,
      category: "ai",
      operation: "deepgramRetranscribe",
      message: e instanceof Error ? e.message : "Deepgram retranscription failed",
      retryable: false,
      callSid,
    }).catch(() => {});
  }
}
