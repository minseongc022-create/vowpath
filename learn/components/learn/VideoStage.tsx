import type { DemoLesson } from "@/learn/lib/demo-data";
import { formatDuration } from "@/learn/lib/demo-data";

type VideoStageProps = {
  lesson: DemoLesson;
  courseTitle: string;
};

export function VideoStage({ lesson, courseTitle }: VideoStageProps) {
  return (
    <div className="learn-animate-in">
      {/* 16:9 video area — optimized for iPad landscape */}
      <div className="relative aspect-video w-full overflow-hidden rounded-none bg-learn-ink md:rounded-2xl">
        {lesson.videoUrl ? (
          <video
            src={lesson.videoUrl}
            controls
            className="h-full w-full object-cover"
            playsInline
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#1a1f36] to-[#2d3561] p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white/70">{courseTitle}</p>
              <p className="mt-1 text-lg font-bold text-white">{lesson.title}</p>
              <p className="mt-2 text-sm text-white/50">
                영상 준비 중 · {formatDuration(lesson.durationSec)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lesson meta below video */}
      <div className="px-4 py-4 md:px-0 md:py-5">
        <h1 className="text-lg font-bold leading-snug text-learn-ink md:text-xl">
          {lesson.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-learn-ink-muted">
          {lesson.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-learn-muted px-3 py-1 text-xs font-medium text-learn-ink-muted">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(lesson.durationSec)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="learn-live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
            AI 에이전트 활성
          </span>
        </div>
      </div>
    </div>
  );
}
