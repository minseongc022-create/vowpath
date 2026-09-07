import "server-only";

import ClawOps from "@teamlearners/clawops";
import { buildClawOpsCallInstruction, koreanPhoneToE164 } from "./reservation-policy";
import type { ReservationExecutionProvider } from "./reservation-queue";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function publicBaseUrl(): string {
  const configured = process.env.HARUWITH_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error("HARUWITH_PUBLIC_BASE_URL_MISSING");
}

function client(): ClawOps {
  return new ClawOps({
    apiKey: required("CLAWOPS_API_KEY"),
    accountId: required("CLAWOPS_ACCOUNT_ID"),
    baseURL: process.env.CLAWOPS_BASE_URL?.trim() || undefined,
    timeout: 20_000,
    // Calls.create has no documented idempotency key. Retrying that POST can
    // create a second restaurant call when only the first response was lost.
    maxRetries: 0,
  });
}

export const clawOpsReservationProvider: ReservationExecutionProvider = {
  id: "clawops_phone",
  async start(job) {
    const from = required("CLAWOPS_FROM_NUMBER");
    if (!/^\+[1-9]\d{7,14}$/.test(from)) throw new Error("CLAWOPS_FROM_NUMBER_MUST_BE_E164");
    const result = await client().calls.create({
      to: koreanPhoneToE164(job.goal.venuePhone),
      from,
      agentId: required("CLAWOPS_AGENT_ID"),
      callContext: {
        instruction: buildClawOpsCallInstruction(job.goal, job.contact),
        variables: {
          haruwith_job_id: job.id,
          venue_name: job.goal.venueName,
          requested_date: job.goal.date,
          requested_time: job.goal.time,
          party_size: job.goal.partySize,
          reservation_name: job.goal.reservationName,
          target_seconds: 180,
          absolute_max_seconds: 240,
        },
      },
      statusCallback: `${publicBaseUrl()}/api/dajeong/reservations/clawops/webhook?jobId=${encodeURIComponent(job.id)}`,
      statusCallbackEvent: "initiated ringing answered completed",
      timeout: 60,
      machineDetection: "Hangup",
    });
    return { callId: result.callId, status: result.status };
  },
  async get(callId) {
    const call = await client().calls.get(callId);
    return {
      callId: call.callId,
      status: call.status,
      durationSeconds: call.duration ?? undefined,
      endedAt: call.dateUpdated ?? undefined,
      hangupCause: call.hangupCause ?? undefined,
      hangupSource: call.hangupSource ?? undefined,
      sipResponseCode: call.sipResponseCode ?? undefined,
    };
  },
  async terminate(callId) {
    await client().calls.update(callId, { status: "completed" });
  },
  async transcript(callId) {
    const result = await client().calls.getTranscript(callId);
    return {
      status: result.status,
      segments: result.segments?.map((segment) => ({ speaker: segment.speaker, text: segment.text })),
    };
  },
  async requestTranscript(callId) {
    await client().calls.requestTranscript(callId);
  },
};

export function verifyClawOpsWebhook(url: string, params: Record<string, string>, signature: string): boolean {
  return client().webhooks.verify({ url, params, signature, signingKey: required("CLAWOPS_SIGNING_KEY") });
}

export function clawOpsConfigured(): boolean {
  return ["CLAWOPS_API_KEY", "CLAWOPS_ACCOUNT_ID", "CLAWOPS_FROM_NUMBER", "CLAWOPS_AGENT_ID", "CLAWOPS_SIGNING_KEY"].every((key) => Boolean(process.env[key]?.trim()));
}
