"use client";

import { useCallback, useEffect, useState } from "react";
import { createLearnSupabaseClient, isSupabaseConfigured } from "@/learn/lib/supabase/client";
import type { PlannerRecord } from "@/learn/types";
import { cn } from "@/learn/lib/utils";

type PlannerBoardProps = {
  initialItems: PlannerRecord[];
  userId?: string;
};

export function PlannerBoard({ initialItems, userId }: PlannerBoardProps) {
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");

  const toggle = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, completed: !item.completed } : item,
        ),
      );

      if (userId) {
        const item = items.find((i) => i.id === id);
        if (item) {
          await fetch(`/learn/api/planner/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: !item.completed }),
          });
        }
      }
    },
    [items, userId],
  );

  const addItem = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;

    const optimistic: PlannerRecord = {
      id: `temp-${Date.now()}`,
      title,
      completed: false,
      priority: 0,
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setNewTitle("");

    if (userId) {
      const res = await fetch("/learn/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const saved = (await res.json()) as PlannerRecord;
        setItems((prev) => prev.map((i) => (i.id === optimistic.id ? saved : i)));
      }
    }
  }, [newTitle, userId]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    const supabase = createLearnSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`learn-planner-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learn_planner_items",
          filter: `userId=eq.${userId}`,
        },
        () => {
          fetch("/learn/api/planner")
            .then((r) => r.json())
            .then((data: PlannerRecord[]) => setItems(data))
            .catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const pending = items.filter((i) => !i.completed);
  const done = items.filter((i) => i.completed);

  return (
    <div className="space-y-6">
      {/* Quick add — Toss-style single input */}
      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addItem()}
          placeholder="새 학습 목표 추가"
          className="h-12 flex-1 rounded-2xl border border-learn-border bg-learn-surface px-4 text-sm outline-none transition-colors focus:border-learn-primary/50"
        />
        <button
          type="button"
          onClick={() => void addItem()}
          className="h-12 shrink-0 rounded-2xl bg-learn-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-learn-primary-hover"
        >
          추가
        </button>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-learn-ink-muted">할 일</h2>
          <ul className="space-y-2">
            {pending.map((item) => (
              <PlannerRow key={item.id} item={item} onToggle={() => void toggle(item.id)} />
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-learn-ink-muted">완료</h2>
          <ul className="space-y-2">
            {done.map((item) => (
              <PlannerRow key={item.id} item={item} onToggle={() => void toggle(item.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlannerRow({
  item,
  onToggle,
}: {
  item: PlannerRecord;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-2xl border border-learn-border bg-learn-surface p-4 text-left transition-all hover:border-learn-primary/30 active:scale-[0.99]"
      >
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            item.completed
              ? "border-learn-primary bg-learn-primary text-white"
              : "border-learn-border",
          )}
        >
          {item.completed && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-learn-ink", item.completed && "line-through text-learn-ink-muted")}>
            {item.title}
          </p>
          {item.dueDate && (
            <p className="mt-0.5 text-xs text-learn-ink-subtle">
              {new Date(item.dueDate).toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
