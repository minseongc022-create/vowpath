"use client";

import { useCallback, useEffect, useState } from "react";
import { createLearnSupabaseClient, isSupabaseConfigured } from "@/learn/lib/supabase/client";
import type { NoteRecord } from "@/learn/types";

type LessonNotesEditorProps = {
  lessonId: string;
  userId?: string;
};

export function LessonNotesEditor({ lessonId, userId }: LessonNotesEditorProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("강의 필기");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [syncLabel, setSyncLabel] = useState("로컬 저장");

  const save = useCallback(
    async (nextContent: string, nextTitle: string) => {
      if (!userId) {
        localStorage.setItem(`learn-note-${lessonId}`, nextContent);
        setStatus("saved");
        setSyncLabel("로컬 저장됨");
        return;
      }

      setStatus("saving");
      try {
        const res = await fetch("/learn/api/notes", {
          method: noteId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: noteId,
            lessonId,
            title: nextTitle,
            content: nextContent,
          }),
        });
        if (!res.ok) throw new Error("save failed");
        const data = (await res.json()) as NoteRecord;
        setNoteId(data.id);
        setStatus("saved");
        setSyncLabel("동기화됨");
      } catch {
        setStatus("error");
        setSyncLabel("저장 실패");
      }
    },
    [lessonId, noteId, userId],
  );

  useEffect(() => {
    if (!userId) {
      const local = localStorage.getItem(`learn-note-${lessonId}`);
      if (local) setContent(local);
      return;
    }

    fetch(`/learn/api/notes?lessonId=${lessonId}`)
      .then((r) => r.json())
      .then((notes: NoteRecord[]) => {
        if (notes[0]) {
          setNoteId(notes[0].id);
          setTitle(notes[0].title);
          setContent(notes[0].content);
        }
      })
      .catch(() => undefined);
  }, [lessonId, userId]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    const supabase = createLearnSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`learn-notes-${lessonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learn_notes",
          filter: `lessonId=eq.${lessonId}`,
        },
        (payload) => {
          const row = payload.new as NoteRecord | undefined;
          if (row && row.id !== noteId) {
            setContent(row.content);
            setTitle(row.title);
            setSyncLabel("실시간 동기화");
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lessonId, noteId, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (content) void save(content, title);
    }, 800);
    return () => clearTimeout(timer);
  }, [content, title, save]);

  return (
    <div className="flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm font-bold text-learn-ink outline-none placeholder:text-learn-ink-subtle"
          placeholder="필기 제목"
        />
        <span className="text-[10px] font-medium text-learn-ink-subtle">
          {status === "saving" ? "저장 중…" : syncLabel}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          setStatus("idle");
          setContent(e.target.value);
        }}
        placeholder="강의 내용을 자유롭게 필기하세요. 모든 기기에서 실시간 동기화됩니다."
        className="learn-scroll min-h-[200px] flex-1 resize-none rounded-xl border border-learn-border bg-learn-surface p-3 text-sm leading-relaxed text-learn-ink outline-none transition-colors focus:border-learn-primary/50"
      />
      {!userId && (
        <p className="mt-2 text-[11px] text-learn-ink-subtle">
          로그인하면 필기가 클라우드에 저장됩니다.
        </p>
      )}
    </div>
  );
}
