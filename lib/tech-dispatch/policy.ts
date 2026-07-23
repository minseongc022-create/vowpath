import type { RequestStatus } from "../booking-policy";
import type { TechDispatchSettings } from "./types";

/**
 * When to auto-SMS the crew after a booking status change.
 *
 * - assignOnApprove ON (default): only after owner-approved / auto-scheduled.
 * - assignOnApprove OFF: also when a customer slot is already reserved while
 *   still pending_review — “text crew as soon as the job confirms.”
 */
export function shouldAutoStartTechDispatch(
  settings: Pick<TechDispatchSettings, "enabled" | "assignOnApprove">,
  status: RequestStatus,
  opts?: { hasScheduledSlot?: boolean },
): boolean {
  if (!settings.enabled) return false;
  if (status === "approved" || status === "scheduled") return true;
  if (
    !settings.assignOnApprove &&
    status === "pending_review" &&
    opts?.hasScheduledSlot
  ) {
    return true;
  }
  return false;
}

/** Effective offer timeout — P1 escalates faster so emergencies don't sit. */
export function effectiveOfferTimeoutMinutes(
  responseTimeoutMinutes: number,
  priority: string | undefined,
): number {
  const base = Math.min(120, Math.max(5, Math.round(responseTimeoutMinutes) || 10));
  if ((priority ?? "").toUpperCase() === "P1") return Math.min(5, base);
  return base;
}
