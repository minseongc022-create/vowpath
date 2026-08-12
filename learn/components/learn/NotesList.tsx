"use client";

import { useEffect, useState } from "react";
import { createLearnSupabaseClient, isSupabaseConfigured } from "@/learn/lib/supabase/client";
import type { NoteRecord } from "@/learn/types";

type NotesListProps = {
  initialNotes: NoteRecord[];
  userId?: string;
};

export function NotesList({ initialNotes, userId }: NotesListProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    const supabase = createLearnSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`learn-notes-list-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learn_notes",
          filter: `userId=eq.${userId}`,
        },
        () => {
          fetch("/learn/api/notes")
            .then((r) => r.json())
            .then((data: NoteRecord[]) => setNotes(data))
            .catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (notes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-learn-border p-8 text-center text-sm text-learn-ink-muted">
        아직 필기가 없습니다. 강의를 보며 필기를 시작해보세요.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li key={note.id}>
          <button
            type="button"
            onClick={() => setExpanded(expanded === note.id ? null : note.id)}
            className="w-full rounded-2xl border border-learn-border bg-learn-surface p-4 text-left transition-all hover:border-learn-primary/30 hover:shadow-learn-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-learn-ink">{note.title}</h3>
              <time className="shrink-0 text-[11px] text-learn-ink-subtle">
                {new Date(note.updatedAt).toLocaleDateString("ko-KR")}
              </time>
            </div>
            {expanded === note.id && (
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-learn-ink-muted">
                {note.content}
              </pre>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
