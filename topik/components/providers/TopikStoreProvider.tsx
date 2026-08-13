"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { SrsCard, UserProgress } from "@/topik/types";
import type { WrongRecord } from "@/topik/lib/store/types";
import {
  addLessonVocabToStore,
  addWrongToStore,
  getDueCardsFromStore,
  getSrsStatsFromStore,
  getTopikStoreServerSnapshot,
  getTopikStoreSnapshot,
  incrementWritingInStore,
  markLessonCompleteInStore,
  resolveWrongInStore,
  reviewCardInStore,
  subscribeTopikStore,
} from "@/topik/lib/store/client-store";

type TopikStoreContext = {
  progress: UserProgress;
  srsStats: { due: number; total: number; mastered: number };
  wrongAnswers: WrongRecord[];
  dueCards: SrsCard[];
  markLessonComplete: (lessonId: string) => void;
  addLessonVocab: (
    lessonId: string,
    level: UserProgress["targetLevel"],
    items: { id: string; korean: string; vietnamese: string }[],
  ) => number;
  addWrong: (record: Omit<WrongRecord, "id" | "createdAt" | "resolved">) => void;
  resolveWrong: (id: string) => void;
  reviewCard: (cardId: string, quality: number) => void;
  incrementWriting: () => void;
};

const Ctx = createContext<TopikStoreContext | null>(null);

export function TopikStoreProvider({ children }: { children: React.ReactNode }) {
  const store = useSyncExternalStore(
    subscribeTopikStore,
    getTopikStoreSnapshot,
    getTopikStoreServerSnapshot,
  );

  const value = useMemo<TopikStoreContext>(
    () => ({
      progress: store.progress,
      srsStats: getSrsStatsFromStore(store),
      wrongAnswers: store.wrongAnswers.filter((w) => !w.resolved),
      dueCards: getDueCardsFromStore(store),
      markLessonComplete: (lessonId) => {
        markLessonCompleteInStore(store, lessonId);
      },
      addLessonVocab: (lessonId, level, items) => {
        const before = store.srsCards.length;
        addLessonVocabToStore(store, lessonId, level, items);
        return getTopikStoreSnapshot().srsCards.length - before;
      },
      addWrong: (record) => {
        addWrongToStore(store, record);
      },
      resolveWrong: (id) => {
        resolveWrongInStore(store, id);
      },
      reviewCard: (cardId, quality) => {
        reviewCardInStore(store, cardId, quality);
      },
      incrementWriting: () => {
        incrementWritingInStore(store);
      },
    }),
    [store],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTopikStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTopikStore must be used within TopikStoreProvider");
  return ctx;
}
