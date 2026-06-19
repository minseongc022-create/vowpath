import { listUsers } from "../users-db";
import { getTechDispatchSettings, getTechAssignment, saveTechAssignment } from "./store";
import { startTechAssignmentForBooking } from "./assign";

function offerTimedOut(offeredAt: string, timeoutMinutes: number): boolean {
  const ms = timeoutMinutes * 60 * 1000;
  return Date.now() - new Date(offeredAt).getTime() >= ms;
}

/** Expire stale tech offers and offer to the next crew member. */
export async function processExpiredTechOffersForUser(userId: string): Promise<number> {
  const settings = await getTechDispatchSettings(userId);
  if (!settings.enabled || !settings.techs.length) return 0;

  const { listCallLogs } = await import("../call-logs");
  const calls = await listCallLogs(userId);
  let escalated = 0;

  for (const call of calls) {
    const bookingId = `call-${call.id}`;
    const assignment = await getTechAssignment(userId, bookingId);
    if (!assignment || assignment.status !== "offering" || !assignment.currentTechId) continue;

    const pending = assignment.offers.find(
      (o) => o.techId === assignment.currentTechId && o.outcome === "pending",
    );
    if (!pending) continue;
    if (!offerTimedOut(pending.offeredAt, settings.responseTimeoutMinutes)) continue;

    pending.outcome = "expired";
    assignment.currentTechId = null;
    assignment.updatedAt = new Date().toISOString();
    await saveTechAssignment(assignment);

    const { clearTechPendingOffer } = await import("./store");
    await clearTechPendingOffer(userId, pending.techId);

    await startTechAssignmentForBooking(userId, bookingId);
    escalated += 1;
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
