/** 14-day product trial — phone, SMS, and dispatch included. */
export const TRIAL_DAYS = 14;

/** Feedback cohort: $129/mo instead of $189/mo for this many months (5 years). */
export const FEEDBACK_DISCOUNT_MONTHS = 60;

export function feedbackCohortPriceStepDate(from: Date = new Date()): Date {
  const step = new Date(from);
  step.setMonth(step.getMonth() + FEEDBACK_DISCOUNT_MONTHS);
  return step;
}
