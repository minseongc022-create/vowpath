import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  DailyActivity,
  QuizAttempt,
  QuizSet,
  WrongAnswerRecord,
} from "@/learn/types/quiz";

const DATA_DIR = join(process.cwd(), ".data", "learn-activity");

type ActivityStore = {
  quizSets: Record<string, QuizSet>;
  attempts: QuizAttempt[];
  wrongAnswers: WrongAnswerRecord[];
};

async function loadStore(userId: string): Promise<ActivityStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(join(DATA_DIR, `${userId}.json`), "utf8");
    return JSON.parse(raw) as ActivityStore;
  } catch {
    return { quizSets: {}, attempts: [], wrongAnswers: [] };
  }
}

async function saveStore(userId: string, store: ActivityStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, `${userId}.json`), JSON.stringify(store, null, 2));
}

export async function getOrCreateQuizSet(
  userId: string,
  materialId: string,
  factory: () => QuizSet,
): Promise<QuizSet> {
  const store = await loadStore(userId);
  if (store.quizSets[materialId]) return store.quizSets[materialId]!;
  const quiz = factory();
  store.quizSets[materialId] = quiz;
  await saveStore(userId, store);
  return quiz;
}

export async function saveQuizAttempt(
  userId: string,
  attempt: QuizAttempt,
  wrongOnes: Omit<WrongAnswerRecord, "id" | "createdAt" | "resolved">[],
): Promise<{ attempt: QuizAttempt; wrongAdded: number }> {
  const store = await loadStore(userId);
  store.attempts.unshift(attempt);
  let wrongAdded = 0;
  for (const w of wrongOnes) {
    const exists = store.wrongAnswers.some(
      (x) => x.materialId === w.materialId && x.questionId === w.questionId && !x.resolved,
    );
    if (!exists) {
      store.wrongAnswers.unshift({
        ...w,
        id: `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        resolved: false,
      });
      wrongAdded++;
    }
  }
  await saveStore(userId, store);
  return { attempt, wrongAdded };
}

export async function listWrongAnswers(userId: string): Promise<WrongAnswerRecord[]> {
  const store = await loadStore(userId);
  return store.wrongAnswers.filter((w) => !w.resolved);
}

export async function resolveWrongAnswer(
  userId: string,
  id: string,
): Promise<boolean> {
  const store = await loadStore(userId);
  const idx = store.wrongAnswers.findIndex((w) => w.id === id);
  if (idx < 0) return false;
  store.wrongAnswers[idx]!.resolved = true;
  await saveStore(userId, store);
  return true;
}

function dateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function getDailyActivities(
  userId: string,
  days = 14,
): Promise<DailyActivity[]> {
  const store = await loadStore(userId);
  const map = new Map<string, DailyActivity>();

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    map.set(key, {
      date: key,
      materialIds: [],
      materialTitles: [],
      quizAttempts: 0,
      avgScore: null,
      totalQuestions: 0,
      correctCount: 0,
    });
  }

  for (const attempt of store.attempts) {
    const key = dateKey(new Date(attempt.completedAt));
    const day = map.get(key);
    if (!day) continue;

    if (attempt.score === -1) {
      // Material view marker
      if (!day.materialIds.includes(attempt.materialId)) {
        day.materialIds.push(attempt.materialId);
        day.materialTitles.push(attempt.materialTitle);
      }
      continue;
    }

    day.quizAttempts++;
    day.totalQuestions += attempt.total;
    day.correctCount += attempt.score;
    if (!day.materialIds.includes(attempt.materialId)) {
      day.materialIds.push(attempt.materialId);
      day.materialTitles.push(attempt.materialTitle);
    }
  }

  for (const day of map.values()) {
    if (day.quizAttempts > 0 && day.totalQuestions > 0) {
      day.avgScore = Math.round((day.correctCount / day.totalQuestions) * 100);
    }
  }

  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export async function recordMaterialViewed(
  userId: string,
  materialId: string,
  materialTitle: string,
): Promise<void> {
  const store = await loadStore(userId);
  const key = dateKey();
  // Store as a zero-score attempt marker via attempts with special pattern
  // Simpler: track in attempts with score=-1 sentinel — use separate field
  const marker: QuizAttempt = {
    id: `view-${Date.now()}`,
    materialId,
    materialTitle,
    score: -1,
    total: 0,
    answers: [],
    completedAt: new Date().toISOString(),
  };
  const todayViews = store.attempts.filter(
    (a) => a.score === -1 && a.materialId === materialId && dateKey(new Date(a.completedAt)) === key,
  );
  if (todayViews.length === 0) {
    store.attempts.unshift(marker);
    await saveStore(userId, store);
  }
}

export async function getRecentAttempts(userId: string, limit = 10): Promise<QuizAttempt[]> {
  const store = await loadStore(userId);
  return store.attempts.filter((a) => a.score >= 0).slice(0, limit);
}
