import type { UserProgress } from "@/topik/types";

export const WEEKLY_TARGETS = {
  speaking: 3,
  writing: 3,
  quiz: 5,
  lessons: 2,
} as const;

export type WeeklyActivity = {
  speaking: number;
  writing: number;
  quiz: number;
  lessons: number;
};

export function getWeekStartIso(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Count activity from daily journey steps + lesson completions this ISO week */
export function computeWeeklyActivity(progress: UserProgress): WeeklyActivity {
  const weekStart = getWeekStartIso();
  let speaking = 0;
  let writing = 0;
  let quiz = 0;

  for (const [date, steps] of Object.entries(progress.dailyStepsDone ?? {})) {
    if (date < weekStart) continue;
    if (steps.includes("speaking")) speaking++;
    if (steps.includes("writing")) writing++;
    if (steps.includes("drill") || steps.includes("practice") || steps.includes("mock")) quiz++;
  }

  const lessons = Object.values(progress.lessons).filter(
    (l) => l.completed && l.lastAccessedAt.slice(0, 10) >= weekStart,
  ).length;

  return { speaking, writing, quiz, lessons };
}

export function weeklyPct(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((count / target) * 100));
}
