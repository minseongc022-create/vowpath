import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";

/**
 * Real TOPIK items cluster around the exam level; we bias pools slightly above
 * target so daily practice feels a bit harder than the actual test.
 */
export const EXAM_DIFFICULTY_BIAS = 0.75;

/** Minimum section accuracy treated as "exam ready" (stricter than casual apps). */
export const SECTION_PASS_THRESHOLD = 0.68;

export function effectiveQuestionLevel(targetLevel: TopikLevel): number {
  return Math.min(6, targetLevel + EXAM_DIFFICULTY_BIAS);
}

export function maxSelectableLevel(targetLevel: TopikLevel): TopikLevel {
  return Math.min(6, Math.ceil(effectiveQuestionLevel(targetLevel))) as TopikLevel;
}

export function minSelectableLevel(targetLevel: TopikLevel): TopikLevel {
  return Math.max(1, Math.floor(targetLevel - 0.25)) as TopikLevel;
}

function questionWeight(q: TopikQuizQuestion, targetLevel: TopikLevel): number {
  const effective = effectiveQuestionLevel(targetLevel);
  const distance = Math.abs(q.level - effective);
  return Math.max(0.15, 1.6 - distance * 0.55);
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Weighted sample without replacement — favors items near effective level. */
export function selectHarderQuestions(
  pool: TopikQuizQuestion[],
  targetLevel: TopikLevel,
  count: number,
): TopikQuizQuestion[] {
  if (pool.length === 0 || count <= 0) return [];

  const maxLevel = maxSelectableLevel(targetLevel);
  const minLevel = minSelectableLevel(targetLevel);
  let eligible = pool.filter((q) => q.level >= minLevel && q.level <= maxLevel);
  if (eligible.length < count) {
    eligible = pool.filter((q) => q.level <= maxLevel);
  }
  if (eligible.length <= count) {
    return shuffleInPlace([...eligible]).slice(0, count);
  }

  const remaining = [...eligible];
  const picked: TopikQuizQuestion[] = [];
  const seen = new Set<string>();

  while (picked.length < count && remaining.length > 0) {
    const weights = remaining.map((q) => questionWeight(q, targetLevel));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= weights[i]!;
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    const q = remaining.splice(idx, 1)[0]!;
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    picked.push(q);
  }

  return picked;
}
