import "server-only";

import { recordAdEvent } from "./ads";
import { adStateStore } from "./ads-store";
import type { ReservationBatch, ReservationJob } from "./reservation-ops-types";
import type { ReservationPersistentState } from "./reservation-ops-types";

export async function recordReservationAttemptAttribution(batch: ReservationBatch): Promise<number> {
  const secret = process.env.HARUWITH_ADS_SIGNING_SECRET?.trim();
  if (!secret) return 0;
  let recorded = 0;
  for (const token of batch.attributionTokens ?? []) {
    const result = await recordAdEvent(adStateStore, token, secret, "reservation_attempt", { planId: batch.planId, dedupeSuffix: batch.id }).catch(() => ({ recorded: false }));
    if (result.recorded) recorded += 1;
  }
  return recorded;
}

export async function recordReservationSuccessAttribution(batch: ReservationBatch, jobs: ReservationJob[]): Promise<number> {
  const secret = process.env.HARUWITH_ADS_SIGNING_SECRET?.trim();
  if (!secret) return 0;
  let recorded = 0;
  for (const token of batch.attributionTokens ?? []) {
    for (const job of jobs.filter((entry) => entry.status === "succeeded")) {
      const result = await recordAdEvent(adStateStore, token, secret, "reservation_success", { planId: batch.planId, dedupeSuffix: job.id }).catch(() => ({ recorded: false }));
      if (result.recorded) recorded += 1;
    }
  }
  return recorded;
}

export async function recordAllReservationSuccessAttributions(state: ReservationPersistentState): Promise<number> {
  let recorded = 0;
  for (const batch of Object.values(state.batches).filter((entry) => entry.attributionTokens?.length)) {
    recorded += await recordReservationSuccessAttribution(batch, batch.jobIds.map((id) => state.jobs[id]).filter(Boolean));
  }
  return recorded;
}
