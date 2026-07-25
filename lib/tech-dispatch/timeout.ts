import { listCallLogs } from "../call-logs";
import { listJobs } from "../jobs-db";
import { listUsers } from "../users-db";
import {
  getTechDispatchSettings,
  getTechAssignment,
  listPendingOfferBookingIds,
  saveTechAssignment,
} from "./store";
import { startTechAssignmentForBooking } from "./assign";
import { effectiveOfferTimeoutMinutes } from "./policy";

function offerTimedOut(offeredAt: string, timeoutMinutes: number): boolean {
  const ms = timeoutMinutes * 60 * 1000;
  return Date.now() - new Date(offeredAt).getTime() >= ms;
}

/** All booking IDs that may have crew dispatch assignments (calls + native/Jobber jobs). */
export async function listDispatchBookingIds(userId: string): Promise<string[]> {
  const [calls, jobs] = await Promise.all([listCallLogs(userId), listJobs(userId)]);
  const ids = new Set<string>();
  for (const call of calls) ids.add(`call-${call.id}`);
  for (const job of jobs) {
    ids.add(job.id);
    const jobberId = (job as { jobberJobId?: string }).jobberJobId;
    if (jobberId) ids.add(`jobber-${jobberId}`);
  }
  return [...ids];
}

async function expireAndEscalateOffer(
  userId: string,
  bookingId: string,
  timeoutMinutes: number,
): Promise<boolean> {
  const assignment = await getTechAssignment(userId, bookingId);
  if (!assignment || assignment.status !== "offering" || !assignment.currentTechId) {
    return false;
  }

  const pending = assignment.offers.find(
    (o) => o.techId === assignment.currentTechId && o.outcome === "pending",
  );
  if (!pending || !offerTimedOut(pending.offeredAt, timeoutMinutes)) return false;

  pending.outcome = "expired";
  assignment.currentTechId = null;
  assignment.updatedAt = new Date().toISOString();
  await saveTechAssignment(assignment);

  const { clearTechPendingOffer } = await import("./store");
  await clearTechPendingOffer(userId, pending.techId);

  await startTechAssignmentForBooking(userId, bookingId);
  return true;
}

/** Expire stale tech offers and offer to the next crew member. */
export async function processExpiredTechOffersForUser(userId: string): Promise<number> {
  const settings = await getTechDispatchSettings(userId);
  if (!settings.enabled || !settings.techs.length) return 0;

  // Prefer pending-offer keys (O(techs)) over scanning every call/job every minute.
  const bookingIds = await listPendingOfferBookingIds(userId);
  let escalated = 0;

  for (const bookingId of bookingIds) {
    const assignment = await getTechAssignment(userId, bookingId);
    const timeout = effectiveOfferTimeoutMinutes(
      settings.responseTimeoutMinutes,
      assignment?.priority,
    );
    if (await expireAndEscalateOffer(userId, bookingId, timeout)) {
      escalated += 1;
    }
  }

  return escalated;
}

export async function processExpiredTechOffersAll(): Promise<{ users: number; escalated: number }> {
  const users = await listUsers();
  let escalated = 0;
  for (const user of users) {
    escalated += await processExpiredTechOffersForUser(user.id);
  }
  return { users: users.length, escalated };
}
