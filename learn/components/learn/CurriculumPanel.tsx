import Link from "next/link";
import type { DemoCourse, DemoLesson } from "@/learn/lib/demo-data";
import { formatDuration } from "@/learn/lib/demo-data";
import { cn } from "@/learn/lib/utils";

type CurriculumPanelProps = {
  course: DemoCourse;
  currentLessonSlug: string;
};

export function CurriculumPanel({ course, currentLessonSlug }: CurriculumPanelProps) {
  return (
    <div className="learn-scroll flex-1 overflow-y-auto p-4">
      <h2 className="mb-1 text-sm font-bold text-learn-ink">커리큘럼</h2>
      <p className="mb-4 text-xs text-learn-ink-muted">{course.title}</p>
      <ol className="space-y-1">
        {course.lessons.map((lesson: DemoLesson) => {
          const active = lesson.slug === currentLessonSlug;
          return (
            <li key={lesson.id}>
              <Link
                href={`/learn/courses/${course.slug}/lessons/${lesson.slug}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  active
                    ? "bg-learn-primary/10 text-learn-primary"
                    : "text-learn-ink-muted hover:bg-learn-muted hover:text-learn-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    active
                      ? "bg-learn-primary text-white"
                      : "bg-learn-muted text-learn-ink-muted",
                  )}
                >
                  {lesson.sortOrder}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", active && "font-semibold")}>
                    {lesson.title}
                  </p>
                  <p className="text-[11px] text-learn-ink-subtle">
                    {formatDuration(lesson.durationSec)}
                  </p>
                </div>
                {active && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide">
                    재생 중
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
