import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SrsCard, UserProgress, TopikLevel } from "@/topik/types";

const DATA_DIR = join(process.cwd(), ".data", "topik");

type TopikStore = {
  srsCards: SrsCard[];
  progress: UserProgress;
  wrongAnswers: WrongRecord[];
  writingCount: number;
};

export type WrongRecord = {
  id: string;
  questionId: string;
  question: string;
  questionVi?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  selectedIndex?: number;
  textAnswer?: string;
  explanationVi: string;
  level: TopikLevel;
  resolved: boolean;
  createdAt: string;
};

const DEFAULT_PROGRESS: UserProgress = {
  targetLevel: 3,
  streak: 0,
  lessons: {},
  writingCount: 0,
  quizAttempts: 0,
  reviewSessions: 0,
};

async function loadStore(userId: string): Promise<TopikStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(join(DATA_DIR, `${userId}.json`), "utf8");
    return JSON.parse(raw) as TopikStore;
  } catch {
    return { srsCards: [], progress: { ...DEFAULT_PROGRESS }, wrongAnswers: [], writingCount: 0 };
  }
}

async function saveStore(userId: string, store: TopikStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, `${userId}.json`), JSON.stringify(store, null, 2));
}

export function resolveTopikUserId(sessionUserId?: string | null): string {
  return sessionUserId ?? "demo-topik-user";
}

// ─── SRS (SM-2 algorithm) ────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** quality: 0=again, 1=hard, 3=good, 5=easy */
export function sm2Update(card: SrsCard, quality: number): SrsCard {
  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReviewAt: addDays(interval),
    lastReviewedAt: todayIso(),
  };
}

export async function listSrsCards(userId: string): Promise<SrsCard[]> {
  const store = await loadStore(userId);
  return store.srsCards;
}

export async function getDueCards(userId: string): Promise<SrsCard[]> {
  const store = await loadStore(userId);
  const now = new Date().toISOString();
  return store.srsCards.filter((c) => c.nextReviewAt <= now);
}

export async function addSrsCard(
  userId: string,
  card: Omit<SrsCard, "easeFactor" | "interval" | "repetitions" | "nextReviewAt" | "createdAt">,
): Promise<SrsCard> {
  const store = await loadStore(userId);
  const exists = store.srsCards.some((c) => c.id === card.id);
  if (exists) return store.srsCards.find((c) => c.id === card.id)!;

  const newCard: SrsCard = {
    ...card,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewAt: todayIso(),
    createdAt: todayIso(),
  };
  store.srsCards.unshift(newCard);
  await saveStore(userId, store);
  return newCard;
}

export async function reviewSrsCard(
  userId: string,
  cardId: string,
  quality: number,
): Promise<SrsCard | null> {
  const store = await loadStore(userId);
  const idx = store.srsCards.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  store.srsCards[idx] = sm2Update(store.srsCards[idx]!, quality);
  store.progress.reviewSessions++;
  await saveStore(userId, store);
  return store.srsCards[idx]!;
}

export async function addLessonVocabToSrs(
  userId: string,
  lessonId: string,
  level: TopikLevel,
  items: { id: string; korean: string; vietnamese: string }[],
): Promise<number> {
  let added = 0;
  for (const item of items) {
    const id = `vocab-${lessonId}-${item.id}`;
    const store = await loadStore(userId);
    if (store.srsCards.some((c) => c.id === id)) continue;
    await addSrsCard(userId, {
      id,
      kind: "vocab",
      front: item.korean,
      back: item.korean,
      backVi: item.vietnamese,
      level,
      lessonId,
    });
    added++;
  }
  return added;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export async function getProgress(userId: string): Promise<UserProgress> {
  const store = await loadStore(userId);
  return store.progress;
}

export async function updateProgress(
  userId: string,
  patch: Partial<UserProgress>,
): Promise<UserProgress> {
  const store = await loadStore(userId);
  store.progress = { ...store.progress, ...patch };
  await touchStreak(store);
  await saveStore(userId, store);
  return store.progress;
}

async function touchStreak(store: TopikStore): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const last = store.progress.lastStudyDate;
  if (last === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  store.progress.streak = last === yStr ? store.progress.streak + 1 : 1;
  store.progress.lastStudyDate = today;
}

export async function markLessonComplete(
  userId: string,
  lessonId: string,
): Promise<void> {
  const store = await loadStore(userId);
  store.progress.lessons[lessonId] = {
    lessonId,
    completed: true,
    watchedSec: 0,
    lastAccessedAt: todayIso(),
  };
  await touchStreak(store);
  await saveStore(userId, store);
}

// ─── Wrong answers ───────────────────────────────────────────────────────────

export async function saveWrongAnswer(
  userId: string,
  record: Omit<WrongRecord, "id" | "createdAt" | "resolved">,
): Promise<WrongRecord> {
  const store = await loadStore(userId);
  const exists = store.wrongAnswers.some(
    (w) => w.questionId === record.questionId && !w.resolved,
  );
  if (exists) return store.wrongAnswers.find((w) => w.questionId === record.questionId && !w.resolved)!;

  const entry: WrongRecord = {
    ...record,
    id: `wrong-${Date.now()}`,
    createdAt: todayIso(),
    resolved: false,
  };
  store.wrongAnswers.unshift(entry);
  store.progress.quizAttempts++;

  // Auto-add to SRS
  await addSrsCard(userId, {
    id: `quiz-${record.questionId}`,
    kind: "quiz",
    front: record.question,
    back: record.correctAnswer ?? record.options?.[record.correctIndex ?? 0] ?? "",
    backVi: record.explanationVi,
    level: record.level,
    questionId: record.questionId,
  });

  await touchStreak(store);
  await saveStore(userId, store);
  return entry;
}

export async function listWrongAnswers(userId: string): Promise<WrongRecord[]> {
  const store = await loadStore(userId);
  return store.wrongAnswers.filter((w) => !w.resolved);
}

export async function resolveWrongAnswer(userId: string, id: string): Promise<boolean> {
  const store = await loadStore(userId);
  const idx = store.wrongAnswers.findIndex((w) => w.id === id);
  if (idx < 0) return false;
  store.wrongAnswers[idx]!.resolved = true;
  await saveStore(userId, store);
  return true;
}

export async function incrementWritingCount(userId: string): Promise<number> {
  const store = await loadStore(userId);
  store.writingCount++;
  store.progress.writingCount = store.writingCount;
  await touchStreak(store);
  await saveStore(userId, store);
  return store.writingCount;
}

export async function getSrsStats(userId: string): Promise<{
  due: number;
  total: number;
  mastered: number;
}> {
  const store = await loadStore(userId);
  const now = new Date().toISOString();
  const due = store.srsCards.filter((c) => c.nextReviewAt <= now).length;
  const mastered = store.srsCards.filter((c) => c.repetitions >= 3 && c.interval >= 7).length;
  return { due, total: store.srsCards.length, mastered };
}
