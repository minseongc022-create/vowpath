import type { ReservationPersistentState } from "./reservation-ops-types";

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

export function reservationMetrics(state: ReservationPersistentState, now = new Date()) {
  const jobs = Object.values(state.jobs);
  const attempts = jobs.flatMap((job) => job.attempts);
  const durations = attempts.map((attempt) => attempt.durationSeconds).filter((value): value is number => value != null);
  const finished = jobs.filter((job) => ["succeeded", "failed", "needs_user_action"].includes(job.status));
  const successes = jobs.filter((job) => job.status === "succeeded");
  const firstCallSuccess = successes.filter((job) => job.attempts.length === 1).length;
  const waits = state.metrics.filter((event) => event.type === "queue_wait" && event.value != null).map((event) => event.value!);
  const totalMinutes = durations.reduce((sum, value) => sum + value, 0) / 60;
  const monthKey = now.toISOString().slice(0, 7);
  const monthlyMinutes = attempts.filter((attempt) => attempt.startedAt.startsWith(monthKey)).reduce((sum, attempt) => sum + (attempt.durationSeconds ?? 0), 0) / 60;
  const configuredAllowance = Number(process.env.HARUWITH_MONTHLY_MINUTE_ALLOWANCE ?? 100);
  const minuteAllowance = Number.isFinite(configuredAllowance) && configuredAllowance > 0 ? configuredAllowance : 100;
  return {
    totalReservationRequests: state.metrics.filter((event) => event.type === "request").length,
    totalCalls: attempts.length,
    totalOutboundMinutes: Number(totalMinutes.toFixed(2)),
    averageCallSeconds: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    withinThreeMinutesRate: durations.length ? durations.filter((value) => value <= 180).length / durations.length : 0,
    fourMinuteReachedRate: durations.length ? durations.filter((value) => value >= 240).length / durations.length : 0,
    reservationSuccessRate: finished.length ? successes.length / finished.length : 0,
    firstCallSuccessRate: finished.length ? firstCallSuccess / finished.length : 0,
    retryRate: jobs.length ? jobs.filter((job) => job.attempts.length > 1 || job.status === "retry_scheduled").length / jobs.length : 0,
    noAnswer: attempts.filter((attempt) => attempt.providerStatus === "no-answer").length,
    busy: attempts.filter((attempt) => attempt.providerStatus === "busy").length,
    needsUserAction: jobs.filter((job) => job.status === "needs_user_action").length,
    averageQueueWaitSeconds: waits.length ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length) : 0,
    p95QueueWaitSeconds: Math.round(percentile(waits, 0.95)),
    queueDepth: jobs.filter((job) => ["queued", "retry_scheduled"].includes(job.status)).length,
    activeCalls: jobs.filter((job) => job.status === "calling").length,
    averageMinutesPerSuccessfulReservation: successes.length ? Number((totalMinutes / successes.length).toFixed(2)) : 0,
    monthlyOutboundMinutes: Number(monthlyMinutes.toFixed(2)),
    individualMinuteAllowance: minuteAllowance,
    minuteAllowanceUsedRate: monthlyMinutes / minuteAllowance,
    minuteAllowanceWarning: monthlyMinutes >= minuteAllowance * 0.8,
  };
}
