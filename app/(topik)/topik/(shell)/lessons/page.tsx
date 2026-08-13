import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { getAllLevels, getLessonsByLevel, tierForLevel } from "@/topik/lib/curriculum/lessons";
import type { TopikLevel } from "@/topik/types";

export default function LessonsIndexPage() {
  const levels = getAllLevels();

  return (
    <main className="topik-page">
      <TopikPageHeader
        title={vi.lessons.title}
        subtitle="Video + từ vựng + ngữ pháp · Lộ trình TOPIK 1→6"
      />

      <section className="mb-6">
        <p className="topik-section-title mb-3">{vi.lessons.topikI}</p>
        <div className="space-y-3">
          {levels.filter((l) => tierForLevel(l) === "topik-i").map((level) => (
            <LevelBlock key={level} level={level} />
          ))}
        </div>
      </section>

      <section>
        <p className="topik-section-title mb-3">{vi.lessons.topikII}</p>
        <div className="space-y-3">
          {levels.filter((l) => tierForLevel(l) === "topik-ii").map((level) => (
            <LevelBlock key={level} level={level} />
          ))}
        </div>
      </section>
    </main>
  );
}

function LevelBlock({ level }: { level: TopikLevel }) {
  const lessons = getLessonsByLevel(level);
  return (
    <div className="topik-card-soft overflow-hidden">
      <div className="bg-[var(--topik-purple-soft)] px-4 py-2.5">
        <p className="text-sm font-semibold text-learn-primary">{vi.lessons.level} {level}</p>
      </div>
      <div className="divide-y divide-learn-border">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/topik/lessons/${level}/${lesson.id}`}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-learn-muted/40"
          >
            <span className="topik-icon-box bg-learn-muted text-lg !w-10 !h-10 !rounded-xl">
              {lesson.category === "writing" ? "✍️" : lesson.category === "reading" ? "📖" : lesson.category === "vocabulary" ? "📖" : "📐"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-learn-ink truncate">{lesson.titleVi}</p>
              <p className="text-[11px] text-learn-ink-muted">{lesson.durationMin} {vi.lessons.minutes}</p>
            </div>
            <span className="text-learn-primary text-sm opacity-60">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
