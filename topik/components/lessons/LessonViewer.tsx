"use client";

import { useState } from "react";
import type { TopikLesson } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";
import { useTopikStore } from "@/topik/components/providers/TopikStoreProvider";

function youtubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}

export function LessonViewer({ lesson }: { lesson: TopikLesson }) {
  const { markLessonComplete, addLessonVocab } = useTopikStore();
  const [tab, setTab] = useState<"video" | "vocab" | "grammar">("video");
  const [completed, setCompleted] = useState(false);
  const [addedSrs, setAddedSrs] = useState(false);
  const embed = youtubeEmbedUrl(lesson.videoUrl);

  function handleComplete() {
    markLessonComplete(lesson.id);
    setCompleted(true);
  }

  function handleAddReview() {
    addLessonVocab(
      lesson.id,
      lesson.level,
      lesson.vocabulary.map((v) => ({ id: v.id, korean: v.korean, vietnamese: v.vietnamese })),
    );
    setAddedSrs(true);
  }

  return (
    <div className="space-y-4 topik-animate-in">
      <div>
        <span className="topik-badge">TOPIK {lesson.level}</span>
        <h1 className="mt-2 text-lg font-extrabold">{lesson.titleVi}</h1>
        <p className="text-xs text-[var(--topik-ink-muted)]">{lesson.title}</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-[var(--topik-muted)] p-1">
        {(["video", "vocab", "grammar"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === t ? "bg-[var(--topik-surface)] text-[var(--topik-primary)] shadow-[var(--topik-shadow-sm)]" : "text-[var(--topik-ink-muted)]"
            }`}
          >
            {t === "video" && "Video"}
            {t === "vocab" && vi.lessons.vocabulary}
            {t === "grammar" && vi.lessons.grammar}
          </button>
        ))}
      </div>

      {tab === "video" && (
        <div>
          {embed ? (
            <div className="relative aspect-video rounded-[var(--topik-radius-lg)] overflow-hidden bg-black shadow-[var(--topik-shadow-md)]">
              <iframe
                src={embed}
                title={lesson.titleVi}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-[var(--topik-radius-lg)] bg-[var(--topik-muted)] flex items-center justify-center">
              <p className="text-sm text-[var(--topik-ink-muted)]">Video sắp cập nhật</p>
            </div>
          )}
          <p className="mt-3 text-sm text-[var(--topik-ink-muted)] leading-relaxed">{lesson.descriptionVi}</p>
        </div>
      )}

      {tab === "vocab" && (
        <div className="space-y-2">
          {lesson.vocabulary.map((v) => (
            <div key={v.id} className="topik-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold">{v.korean}</p>
                  {v.romanization && <p className="text-xs text-[var(--topik-ink-subtle)]">{v.romanization}</p>}
                </div>
                <p className="text-sm font-semibold text-[var(--topik-primary)]">{v.vietnamese}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "grammar" && (
        <div className="space-y-2">
          {lesson.grammarPoints.map((g) => (
            <div key={g.id} className="topik-card p-4">
              <p className="text-sm font-bold text-[var(--topik-accent)]">{g.pattern}</p>
              <p className="text-xs text-[var(--topik-ink-muted)] mt-1">{g.meaningVi}</p>
              <p className="mt-2 text-sm">{g.example}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pb-4">
        <button type="button" onClick={handleComplete} disabled={completed} className="topik-btn-primary flex-1 !w-auto">
          {completed ? vi.lessons.completed : vi.lessons.markComplete}
        </button>
        <button
          type="button"
          onClick={handleAddReview}
          disabled={addedSrs}
          className="topik-btn-primary flex-1 !w-auto !bg-[var(--topik-surface)] !text-[var(--topik-ink)] border border-[var(--topik-border)] shadow-none"
        >
          {addedSrs ? vi.lessons.addedToReview : vi.lessons.addToReview}
        </button>
      </div>
    </div>
  );
}
