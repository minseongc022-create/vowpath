/** Signup trial length — phone, SMS, and dispatch included (3 weeks). */
export const TRIAL_DAYS = 21;

/** Pilot for shops with an Effiroad inbound line bound — matches outreach evaluation window. */
export const PILOT_TRIAL_DAYS = 21;

/**
 * Grace period after the trial ends before access is hard-cut. The dashboard
 * nags them to subscribe during these days, but phone/SMS/dispatch keep
 * working so a card hiccup or a busy week doesn't instantly kill their line.
 * After this, unpaid accounts are blocked with no exceptions.
 */
export const TRIAL_GRACE_DAYS = 2;

/** Absolute moment access is cut for a trial that never converted. */
export function trialHardCutoff(trialEndsAt: string | Date): number {
  const end = new Date(trialEndsAt).getTime();
  return end + TRIAL_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

/** True while a trial is over but still inside the grace window (nag, don't block). */
export function isInTrialGrace(trialEndsAt: string | Date | undefined, now = Date.now()): boolean {
  if (!trialEndsAt) return false;
  const end = new Date(trialEndsAt).getTime();
  return now >= end && now < trialHardCutoff(trialEndsAt);
}

/** Feedback cohort: discounted Pro instead of list Pro for this many months (5 years). */
export const FEEDBACK_DISCOUNT_MONTHS = 60;

export function feedbackCohortPriceStepDate(from: Date = new Date()): Date {
  const step = new Date(from);
  step.setMonth(step.getMonth() + FEEDBACK_DISCOUNT_MONTHS);
  return step;
}
