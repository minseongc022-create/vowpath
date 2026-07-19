import { SITE } from "./constants";
import { addCallLog } from "./call-logs";
import { addJobRecord } from "./jobs-db";
import { persistRequestStatusForBooking } from "./booking-status-sync";
import { recordServiceRequestCreated } from "./record-tenant-events";
import type { EstimateAnswers } from "./estimate-intake/types";
import type { JobCard } from "./types";

export const ESTIMATE_ARRIVAL_WINDOW =
  "Free estimate request — quote & schedule with customer";

export function isEstimateJob(job: Pick<JobCard, "requestKind" | "arrivalWindow" | "symptom">): boolean {
  if (job.requestKind === "estimate") return true;
  const window = (job.arrivalWindow ?? "").toLowerCase();
  if (window.includes("estimate") || window.includes("quote")) return true;
  const symptom = (job.symptom ?? "").toLowerCase();
  return symptom.startsWith("estimate:") || symptom.includes("estimate request");
}

function buildEstimateSymptom(answers: EstimateAnswers, summary: string): string {
  const damage = answers.damageType?.trim();
  const noticed = answers.noticedWhen?.trim();
  const preferred = answers.preferredTime?.trim();
  const parts = [
    "Estimate request",
    damage ? `— ${damage}` : "",
    noticed ? `(noticed ${noticed})` : "",
    preferred ? `· prefers ${preferred}` : "",
  ].filter(Boolean);
  const head = parts.join(" ").replace(/\s+/g, " ").trim();
  const cleanSummary = summary.trim();
  if (!cleanSummary) return head;
  if (cleanSummary.toLowerCase().startsWith("estimate")) return cleanSummary.slice(0, 280);
  return `${head}. ${cleanSummary}`.slice(0, 280);
}

/**
 * Persist a phone/Retell free-estimate lead as a first-class dashboard job.
 * Does NOT bill (estimates are free) and does NOT auto-dispatch.
 */
export async function persistPhoneEstimateLead(params: {
  userId: string;
  callSid: string;
  from?: string;
  to?: string;
  answers: EstimateAnswers;
  summary: string;
}): Promise<{ jobId: string; callId: string }> {
  const callId = crypto.randomUUID();
  const callbackPhone =
    params.answers.callbackPhone?.trim() ||
    (params.from && params.from !== "unknown" ? params.from.trim() : "") ||
    "";
  const customerName = params.answers.name?.trim() || "Estimate caller";
  const address = params.answers.address?.trim() || "Address TBD";
  const symptom = buildEstimateSymptom(params.answers, params.summary);
  const transcript = [
    "Free estimate intake (phone)",
    params.answers.name ? `Name: ${params.answers.name}` : null,
    callbackPhone ? `Callback: ${callbackPhone}` : null,
    params.answers.address ? `Address: ${params.answers.address}` : null,
    params.answers.damageType ? `Project: ${params.answers.damageType}` : null,
    params.answers.noticedWhen ? `Noticed: ${params.answers.noticedWhen}` : null,
    params.answers.preferredTime ? `Preferred time: ${params.answers.preferredTime}` : null,
    `Summary: ${params.summary}`,
  ]
    .filter(Boolean)
    .join("\n");

  await addCallLog({
    id: callId,
    userId: params.userId,
    from: callbackPhone || params.from || "unknown",
    to: params.to || "",
    transcript,
    aiSummary: params.summary,
    priority: "P3",
    priorityReasons: ["Free estimate request — no emergency dispatch"],
    symptom,
    customerName,
    address,
    issueType: "Estimate",
    arrivalWindow: ESTIMATE_ARRIVAL_WINDOW,
    callSid: params.callSid,
    callbackPhone: callbackPhone || undefined,
    verificationComplete: true,
    createdAt: new Date().toISOString(),
  });

  const job = await addJobRecord(params.userId, {
    sourceCallId: callId,
    priority: "P3",
    priorityReasons: ["Free estimate request — quote before scheduling"],
    symptom,
    customerName,
    address,
    arrivalWindow: ESTIMATE_ARRIVAL_WINDOW,
    status: "pending_review",
    requestKind: "estimate",
  });

  await persistRequestStatusForBooking(params.userId, job.id, "pending_review", {
    skipCustomerSms: true,
  });

  await recordServiceRequestCreated({
    userId: params.userId,
    bookingId: job.id,
    callId,
    customerName,
    issueType: "Estimate",
    priority: "P3",
  }).catch(() => undefined);

  return { jobId: job.id, callId };
}

export function estimateDashboardUrl(jobId: string): string {
  return `${SITE.url}/dashboard/bookings/${encodeURIComponent(jobId)}`;
}
