import { classifyRequestPriorityFromTranscript } from "./ai-priority-classification";
import type { IntakeDraft } from "./call-intake/types";
import type { GeneratedJobCard } from "./job-card-ai";
import type { VerifiedCallPayload } from "./call-intake/types";
import type { PriorityFields, PrioritySource, ServicePriority } from "./service-priority";
import { resolvePriorityFields } from "./service-priority";
import type { JobPriority } from "./types";

export type WithPriorityFields<T> = T & PriorityFields;

export async function applyPriorityAnalysisToDraft(
  transcript: string,
  draft: IntakeDraft,
  menuPriority: JobPriority | null,
): Promise<WithPriorityFields<IntakeDraft>> {
  const analysis = await classifyRequestPriorityFromTranscript(transcript, {
    menuPriority,
    supplementalContext: [
      draft.issueType && `issueType: ${draft.issueType}`,
      draft.symptom && `symptom: ${draft.symptom}`,
      draft.customerName && `customer: ${draft.customerName}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return {
    ...draft,
    priority: analysis.priority,
    servicePriority: analysis.servicePriority,
    priorityReasons: analysis.priorityReasons,
    prioritySource: analysis.prioritySource,
  };
}

export async function applyPriorityAnalysisToCard(
  transcript: string,
  card: GeneratedJobCard,
  menuPriority: JobPriority | null = null,
): Promise<WithPriorityFields<GeneratedJobCard>> {
  const analysis = await classifyRequestPriorityFromTranscript(transcript, {
    menuPriority,
    supplementalContext: [
      card.symptom && `symptom: ${card.symptom}`,
      card.customerName && `customer: ${card.customerName}`,
      card.dispatchNotes && `notes: ${card.dispatchNotes}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return {
    ...card,
    priority: analysis.priority,
    servicePriority: analysis.servicePriority,
    priorityReasons: analysis.priorityReasons,
    prioritySource: analysis.prioritySource,
  };
}

export function attachPriorityToPayload(
  payload: Omit<VerifiedCallPayload, keyof PriorityFields> & {
    priority: JobPriority;
    servicePriority?: ServicePriority;
    priorityReasons?: string[];
    prioritySource?: PrioritySource;
    priorityOverriddenAt?: string;
  },
): VerifiedCallPayload {
  const fields = resolvePriorityFields(payload);
  return { ...payload, ...fields };
}

export function attachPriorityToJobInput<T extends { priority: JobPriority }>(
  input: T,
  fields: PriorityFields,
): T & PriorityFields {
  return { ...input, ...fields };
}
