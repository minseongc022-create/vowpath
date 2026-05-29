import { addCallLog } from "./call-logs";
import { generateJobCardFromNotes } from "./job-card-ai";
import { pushJobCardToJobber } from "./jobber-api";
import { getJobberTokens } from "./jobber-tokens";
import type { GeneratedJobCard } from "./job-card-ai";
import { mergeMenuPriority } from "./merge-menu-priority";
import { buildSpeechNotes } from "./twilio-voice-flow";
import type { JobPriority } from "./types";

export type InboundSpeechResult = {
  card: GeneratedJobCard;
  jobberRequestId?: string;
  callLogId: string;
};

export async function processInboundSpeech(
  userId: string,
  speech: string,
  from: string,
  to: string,
  menuPriority: JobPriority | null = null,
): Promise<InboundSpeechResult> {
  const notes = buildSpeechNotes(speech, menuPriority);
  let card = await generateJobCardFromNotes(notes);
  card = mergeMenuPriority(card, menuPriority);

  let jobberRequestId: string | undefined;
  try {
    const tokens = await getJobberTokens(userId);
    if (tokens) {
      const pushed = await pushJobCardToJobber(userId, card);
      jobberRequestId = pushed.requestId;
    }
  } catch (e) {
    console.warn("[process-inbound-speech] jobber push skipped", e);
  }

  const callLogId = crypto.randomUUID();
  await addCallLog({
    id: callLogId,
    userId,
    from,
    to,
    transcript: speech,
    priority: card.priority,
    symptom: card.symptom,
    customerName: card.customerName,
    address: card.address,
    arrivalWindow: card.arrivalWindow,
    jobberRequestId,
    createdAt: new Date().toISOString(),
  });

  return { card, jobberRequestId, callLogId };
}
