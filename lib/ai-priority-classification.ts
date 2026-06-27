import { analyzeServicePriorityFromTranscript } from "./emergency-detection";
import type { LossCategory } from "./loss-category";
import type { JobPriority } from "./types";
import type { PrioritySource, ServicePriority } from "./service-priority";

export type AiPriorityClassification = {
  priority: JobPriority;
  servicePriority: ServicePriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
  lossCategory: LossCategory;
};

/**
 * Classify request priority from the full call transcript (OpenAI).
 * Uses context, not keyword rules. Results must be persisted on job + call log.
 */
export async function classifyRequestPriorityFromTranscript(
  transcript: string,
  options?: {
    menuPriority?: JobPriority | null;
    supplementalContext?: string;
  },
): Promise<AiPriorityClassification> {
  const result = await analyzeServicePriorityFromTranscript(transcript, options);
  return {
    priority: result.priority,
    servicePriority: result.servicePriority,
    priorityReasons: result.priorityReasons,
    prioritySource: result.prioritySource,
    lossCategory: result.lossCategory,
  };
}
