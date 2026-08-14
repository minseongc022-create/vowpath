"use client";

import { useState } from "react";
import type { TopikLesson } from "@/topik/types";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { lessonDescription, lessonTitle } from "@/topik/lib/i18n/content-locale";
import { getDisplayMeaning } from "@/topik/lib/korean/dictionary";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";

function youtubeVideoId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function youtubeEmbedUrl(url?: string): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

function youtubeWatchUrl(url?: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function LessonViewer({ lesson }: { lesson: TopikLesson }) {
  const vi = useTopikVi();

  const [tab, setTab] = useState<"video" | "vocab" | "grammar">("video");
  const [completed, setCompleted] = useState(false);
  const [addedSrs, setAddedSrs] = useState(false);
  const embed = youtubeEmbedUrl(lesson.videoUrl);
  const watchUrl = youtubeWatchUrl(lesson.videoUrl);

  async function markComplete() {
    await fetch("/topik/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete-lesson", lessonId: lesson.id }),
    });
    setCompleted(true);
  }

  async function addToReview() {
    await fetch("/topik/api/srs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-lesson-vocab",
        lessonId: lesson.id,
        level: lesson.level,
        items: lesson.vocabulary.map((v) => ({
          id: v.id,
          korean: v.korean,
          vietnamese: v.vietnamese,
        })),
      }),
    });
    setAddedSrs(true);
  }

  return (
    <div className="space-y-4 topik-animate-in">
      <StudyModeHint />
      <div>
        <span className="topik-badge">TOPIK {lesson.level}</span>
        <h1 className="mt-2 text-lg font-bold text-learn-ink">{lessonTitle(lesson)}</h1>
        <p className="text-xs text-learn-ink-muted">{lesson.title}</p>
        {lesson.channelName && (
          <p className="text-xs text-learn-ink-subtle mt-1">
            {vi.lessons.channel}: {lesson.channelName}
          </p>
        )}
      </div>

      <div className="flex gap-1 rounded-xl bg-learn-muted p-1">
        {(["video", "vocab", "grammar"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === t ? "bg-learn-surface text-learn-primary shadow-learn-sm" : "text-learn-ink-muted"
            }`}
          >
            {t === "video" && vi.lessons.videoTab}
            {t === "vocab" && vi.lessons.vocabulary}
            {t === "grammar" && vi.lessons.grammar}
          </button>
        ))}
      </div>

      {tab === "video" && (
        <div>
          {embed ? (
            <div>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe
                  src={embed}
                  title={lessonTitle(lesson)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
              {watchUrl && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-learn-ink-subtle">{vi.lessons.embedBlocked}</p>
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="topik-btn topik-btn-outline topik-btn-sm"
                  >
                    {vi.lessons.openOnYoutube}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-learn-muted flex items-center justify-center">
              <p className="text-sm text-learn-ink-muted">{vi.lessons.videoSoon}</p>
            </div>
          )}
          <p className="mt-3 text-sm text-learn-ink-muted leading-relaxed">{lessonDescription(lesson)}</p>
        </div>
      )}

      {tab === "vocab" && (
        <div className="space-y-2">
          {lesson.vocabulary.map((v) => (
            <div key={v.id} className="topik-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-learn-ink">
                    <KoreanStudyText text={v.korean} studyMode />
                  </p>
                  {v.romanization && (
                    <p className="text-xs text-learn-ink-subtle">{v.romanization}</p>
                  )}
                </div>
                <p className="text-sm font-semibold text-learn-primary">
                  {getDisplayMeaning({ korean: v.korean, vietnamese: v.vietnamese, romanization: v.romanization, level: lesson.level }, vi.korean.noDefinition)}
                </p>
              </div>
              {v.example && (
                <p className="mt-2 text-xs text-learn-ink-muted border-t border-learn-border pt-2">
                  <KoreanStudyText text={v.example} studyMode />
                  {v.exampleVi && <span className="block mt-0.5 text-learn-ink-subtle">{v.exampleVi}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "grammar" && (
        <div className="space-y-2">
          {lesson.grammarPoints.map((g) => (
            <div key={g.id} className="topik-card p-4">
              <p className="text-sm font-bold text-learn-accent">
                <KoreanStudyText text={g.pattern} studyMode />
              </p>
              <p className="text-xs text-learn-ink-muted mt-1">{g.meaningVi}</p>
              <p className="mt-2 text-sm text-learn-ink">
                <KoreanStudyText text={g.example} studyMode />
              </p>
              <p className="text-xs text-learn-ink-subtle">{g.exampleVi}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void markComplete()}
          disabled={completed}
          className="flex-1 rounded-2xl bg-learn-primary py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {completed ? vi.lessons.completed : vi.lessons.markComplete}
        </button>
        <button
          type="button"
          onClick={() => void addToReview()}
          disabled={addedSrs}
          className="flex-1 rounded-2xl border border-learn-border bg-learn-surface py-3 text-sm font-bold text-learn-ink disabled:opacity-60"
        >
          {addedSrs ? vi.lessons.addedToReview : vi.lessons.addToReview}
        </button>
      </div>
    </div>
  );
}
