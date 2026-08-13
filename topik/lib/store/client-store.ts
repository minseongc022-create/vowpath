"use client";

import type { SrsCard, TopikLevel, UserProgress } from "@/topik/types";
import type { WrongRecord } from "@/topik/lib/store/types";

const STORAGE_KEY = "hanpro-vn-store-v1";

const listeners = new Set<() => void>();

export function subscribeTopikStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyTopikStore(): void {
  listeners.forEach((l) => l());
}

type Store = {
  progress: UserProgress;
  srsCards: SrsCard[];
  wrongAnswers: WrongRecord[];
  writingCount: number;
};

const DEFAULT_PROGRESS: UserProgress = {
  targetLevel: 3,
  streak: 0,
  lessons: {},
  writingCount: 0,
  quizAttempts: 0,
  reviewSessions: 0,
};

function defaultStore(): Store {
  return {
    progress: { ...DEFAULT_PROGRESS },
    srsCards: [],
    wrongAnswers: [],
    writingCount: 0,
  };
}

function loadStore(): Store {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    return { ...defaultStore(), ...JSON.parse(raw) };
  } catch {
    return defaultStore();
  }
}

function saveStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  notifyTopikStore();
}

export function getTopikStoreSnapshot(): Store {
  return loadStore();
}

export function getTopikStoreServerSnapshot(): Store {
  return defaultStore();
}

function todayIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function touchStreak(store: Store): void {
  const today = new Date().toISOString().slice(0, 10);
  const last = store.progress.lastStudyDate;
  if (last === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  store.progress.lastStudyDate = today;
  store.progress.streak = last === yesterday.toISOString().slice(0, 10)
    ? store.progress.streak + 1
    : 1;
}

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
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReviewAt: addDays(interval),
    lastReviewedAt: todayIso(),
  };
}

export function getClientStore(): Store {
  return loadStore();
}

export function getSrsStatsFromStore(store: Store) {
  const now = new Date().toISOString();
  return {
    due: store.srsCards.filter((c) => c.nextReviewAt <= now).length,
    total: store.srsCards.length,
    mastered: store.srsCards.filter((c) => c.repetitions >= 3 && c.interval >= 7).length,
  };
}

export function getDueCardsFromStore(store: Store): SrsCard[] {
  const now = new Date().toISOString();
  return store.srsCards.filter((c) => c.nextReviewAt <= now);
}

export function addSrsCardToStore(
  store: Store,
  card: Omit<SrsCard, "easeFactor" | "interval" | "repetitions" | "nextReviewAt" | "createdAt">,
): Store {
  if (store.srsCards.some((c) => c.id === card.id)) return store;
  const next = {
    ...store,
    srsCards: [
      {
        ...card,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewAt: todayIso(),
        createdAt: todayIso(),
      },
      ...store.srsCards,
    ],
  };
  saveStore(next);
  return next;
}

export function reviewCardInStore(store: Store, cardId: string, quality: number): Store {
  const idx = store.srsCards.findIndex((c) => c.id === cardId);
  if (idx < 0) return store;
  const cards = [...store.srsCards];
  cards[idx] = sm2Update(cards[idx]!, quality);
  touchStreak(store);
  store.progress.reviewSessions++;
  const next = { ...store, srsCards: cards, progress: { ...store.progress } };
  saveStore(next);
  return next;
}

export function markLessonCompleteInStore(store: Store, lessonId: string): Store {
  touchStreak(store);
  store.progress.lessons[lessonId] = {
    lessonId,
    completed: true,
    watchedSec: 0,
    lastAccessedAt: todayIso(),
  };
  const next = { ...store, progress: { ...store.progress } };
  saveStore(next);
  return next;
}

export function addWrongToStore(
  store: Store,
  record: Omit<WrongRecord, "id" | "createdAt" | "resolved">,
): Store {
  if (store.wrongAnswers.some((w) => w.questionId === record.questionId && !w.resolved)) {
    return store;
  }
  const entry: WrongRecord = {
    ...record,
    id: `wrong-${Date.now()}`,
    createdAt: todayIso(),
    resolved: false,
  };
  store.wrongAnswers.unshift(entry);
  store.progress.quizAttempts++;
  touchStreak(store);
  let next = { ...store, wrongAnswers: [...store.wrongAnswers], progress: { ...store.progress } };
  next = addSrsCardToStore(next, {
    id: `quiz-${record.questionId}`,
    kind: "quiz",
    front: record.question,
    back: record.correctAnswer ?? record.options?.[record.correctIndex ?? 0] ?? "",
    backVi: record.explanationVi,
    level: record.level,
    questionId: record.questionId,
  });
  saveStore(next);
  return next;
}

export function resolveWrongInStore(store: Store, id: string): Store {
  const next = {
    ...store,
    wrongAnswers: store.wrongAnswers.map((w) =>
      w.id === id ? { ...w, resolved: true } : w,
    ),
  };
  saveStore(next);
  return next;
}

export function incrementWritingInStore(store: Store): Store {
  store.writingCount++;
  store.progress.writingCount = store.writingCount;
  touchStreak(store);
  const next = { ...store, progress: { ...store.progress } };
  saveStore(next);
  return next;
}

export function addLessonVocabToStore(
  store: Store,
  lessonId: string,
  level: TopikLevel,
  items: { id: string; korean: string; vietnamese: string }[],
): Store {
  let next = store;
  for (const item of items) {
    next = addSrsCardToStore(next, {
      id: `vocab-${lessonId}-${item.id}`,
      kind: "vocab",
      front: item.korean,
      back: item.korean,
      backVi: item.vietnamese,
      level,
      lessonId,
    });
  }
  return next;
}
