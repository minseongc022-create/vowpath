import { addCallLog } from "./call-logs";
import { initialRequestStatusAfterIntake } from "./booking-policy";
import { persistRequestStatusForBooking } from "./booking-status-sync";
import { notifyOwnerNewRequest } from "./customer-sms";
import { addJobRecord } from "./jobs-db";
import { formatCityState } from "./recent-bookings";
import { generateJobCardFromNotes } from "./job-card-ai";
import type { GeneratedJobCard } from "./job-card-ai";
import { resolveAiModelForShop } from "./plan-ai";
import { buildSpeechNotes } from "./twilio-voice-flow";
import type { JobPriority } from "./types";

export type InboundSpeechResult = {
  card: GeneratedJobCard;
  jobberRequestId?: string;
  callLogId: string;
  serviceAreaRejected?: boolean;
  rejectMessage?: string;
};

/** @deprecated Production calls use finalizeVerifiedIntake after DTMF verification. */
export async function processInboundSpeech(
  userId: string,
  speech: string,
  from: string,
  to: string,
  menuPriority: JobPriority | null = null,
): Promise<InboundSpeechResult> {
  const notes = buildSpeechNotes(speech, menuPriority);
  const model = await resolveAiModelForShop(userId);
  const card = await generateJobCardFromNotes(notes, {
    transcript: speech.trim(),
    menuPriority,
    model,
  });

  const callLogId = crypto.randomUUID();
  await addCallLog({
    id: callLogId,
    userId,
    from,
    to,
    transcript: speech,
    priority: card.priority,
    servicePriority: card.servicePriority,
    priorityReasons: card.priorityReasons,
    prioritySource: card.prioritySource,
    symptom: card.symptom,
    customerName: card.customerName,
    address: card.address,
    arrivalWindow: card.arrivalWindow,
    createdAt: new Date().toISOString(),
  });

  try {
    await addJobRecord(userId, {
      priority: card.priority,
      servicePriority: card.servicePriority,
      priorityReasons: card.priorityReasons,
      prioritySource: card.prioritySource,
      symptom: card.symptom,
      customerName: card.customerName,
      address: card.address,
      arrivalWindow: card.arrivalWindow,
      status: initialRequestStatusAfterIntake(),
      sourceCallId: callLogId,
    });
  } catch (e) {
    console.warn("[process-inbound-speech] job record save skipped", e);
  }

  const bookingId = `call-${callLogId}`;

  try {
    await persistRequestStatusForBooking(
      userId,
      bookingId,
      initialRequestStatusAfterIntake(),
    );
  } catch (e) {
    console.warn("[process-inbound-speech] request status seed", e);
  }

  try {
    await notifyOwnerNewRequest({
      userId,
      bookingId,
      customerName: card.customerName,
      symptom: card.symptom,
      priority: card.priority,
      cityState: formatCityState(card.address),
    });
  } catch (e) {
    console.warn("[process-inbound-speech] owner new request sms", e);
  }

  return { card, callLogId };
}
