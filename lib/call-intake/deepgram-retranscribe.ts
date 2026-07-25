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

function addressLocked(callLog: {
  addressConfirmation?: { status?: string } | null;
}): boolean {
  const status = callLog.addressConfirmation?.status;
  return status === "confirmed" || status === "pending_required";
}

/**
 * Re-transcribes a completed call recording with Deepgram (higher accuracy than Twilio's
 * live Gather speech recognition), re-runs GPT extraction on the cleaner transcript, and
 * patches the call log carefully — never overwriting customer-confirmed address or solid
 * live fields with weaker post-call guesses.
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

    const lockAddress = addressLocked(callLog);
    const liveConf = callLog.confidence;
    const avg = (c?: { customerName?: number; address?: number; issueType?: number } | null) => {
      if (!c) return 0;
      const vals = [c.customerName, c.address, c.issueType].filter(
        (n): n is number => typeof n === "number",
      );
      if (!vals.length) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const betterOverall = !liveConf || avg(confidence) >= avg(liveConf);

    const patch: Parameters<typeof patchCallLog>[2] = {
      deepgramTranscript: transcript,
    };

    // Always keep the cleaner transcript; only upgrade fields when safer.
    if (!lockAddress && betterOverall && draft.address?.trim()) {
      patch.address = draft.address;
      patch.serviceLocation = draft.serviceLocation;
    }
    if (betterOverall || !callLog.customerName?.trim()) {
      if (draft.customerName?.trim()) patch.customerName = draft.customerName;
    }
    if (betterOverall || !callLog.issueType?.trim()) {
      if (draft.issueType?.trim()) {
        patch.issueType = draft.issueType;
        patch.symptom = draft.symptom;
      }
    }
    if (betterOverall) {
      patch.priority = draft.priority;
      patch.servicePriority = draft.servicePriority;
      patch.priorityReasons = draft.priorityReasons;
      patch.prioritySource = draft.prioritySource;
      patch.arrivalWindow = draft.arrivalWindow;
      patch.dispatchNotes = draft.dispatchNotes;
      patch.jobberPasteBlock = draft.jobberPasteBlock;
      patch.lossCategory = draft.lossCategory;
      patch.insuranceCarrier = draft.insuranceCarrier;
      patch.insuranceClaimNumber = draft.insuranceClaimNumber;
      patch.waterSource = draft.waterSource;
      patch.activeLoss = draft.activeLoss;
      patch.confidence = confidence;
    }

    await patchCallLog(userId, callLog.id, patch);
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
