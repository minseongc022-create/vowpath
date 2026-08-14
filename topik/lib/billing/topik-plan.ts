/** TOPIK free tier limits — exam core free; AI features metered */

export const TOPIK_FREE_LIMITS = {
  writingCorrectionsPerMonth: 10,
  speakingEvaluationsPerMonth: 10,
} as const;

export function writingRemaining(used: number): number {
  return Math.max(0, TOPIK_FREE_LIMITS.writingCorrectionsPerMonth - used);
}

export function speakingRemaining(used: number): number {
  return Math.max(0, TOPIK_FREE_LIMITS.speakingEvaluationsPerMonth - used);
}

export function canUseWriting(used: number): boolean {
  return used < TOPIK_FREE_LIMITS.writingCorrectionsPerMonth;
}

export function canUseSpeaking(used: number): boolean {
  return used < TOPIK_FREE_LIMITS.speakingEvaluationsPerMonth;
}
