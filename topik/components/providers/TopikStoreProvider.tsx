"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SrsCard, UserProgress } from "@/topik/types";
import type { WrongRecord } from "@/topik/lib/store/types";
import {
  addLessonVocabToStore,
  addWrongToStore,
  getClientStore,
  getDueCardsFromStore,
  getSrsStatsFromStore,
  incrementWritingInStore,
  markLessonCompleteInStore,
  resolveWrongInStore,
  reviewCardInStore,
} from "@/topik/lib/store/client-store";

type TopikStoreContext = {
  ready: boolean;
  progress: UserProgress;
  srsStats: { due: number; total: number; mastered: number };
  wrongAnswers: WrongRecord[];
  dueCards: SrsCard[];
  refresh: () => void;
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
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setReady(true);
  }, []);

  const store = useMemo(() => (ready ? getClientStore() : getClientStore()), [ready, tick]);

  const value = useMemo<TopikStoreContext>(
    () => ({
      ready,
      progress: store.progress,
      srsStats: getSrsStatsFromStore(store),
      wrongAnswers: store.wrongAnswers.filter((w) => !w.resolved),
      dueCards: getDueCardsFromStore(store),
      refresh,
      markLessonComplete: (lessonId) => {
        markLessonCompleteInStore(store, lessonId);
        refresh();
      },
      addLessonVocab: (lessonId, level, items) => {
        const before = store.srsCards.length;
        addLessonVocabToStore(store, lessonId, level, items);
        refresh();
        return getClientStore().srsCards.length - before;
      },
      addWrong: (record) => {
        addWrongToStore(store, record);
        refresh();
      },
      resolveWrong: (id) => {
        resolveWrongInStore(store, id);
        refresh();
      },
      reviewCard: (cardId, quality) => {
        reviewCardInStore(store, cardId, quality);
        refresh();
      },
      incrementWriting: () => {
        incrementWritingInStore(store);
        refresh();
      },
    }),
    [ready, store, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTopikStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTopikStore must be used within TopikStoreProvider");
  return ctx;
}
