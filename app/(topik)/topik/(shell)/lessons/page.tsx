import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { getAllLevels, getLessonsByLevel, tierForLevel } from "@/topik/lib/curriculum/lessons";
import type { TopikLevel } from "@/topik/types";

export default function LessonsIndexPage() {
  const levels = getAllLevels();

  return (
    <main className="mx-auto max-w-lg px-4 py-6 learn-animate-in">
      <h1 className="text-xl font-black text-learn-ink">{vi.lessons.title}</h1>
      <p className="mt-1 text-sm text-learn-ink-muted">
        Video + từ vựng + ngữ pháp · Lộ trình TOPIK 1→6
      </p>

      <section className="mt-6">
        <p className="text-xs font-bold text-learn-primary mb-2">{vi.lessons.topikI}</p>
        <div className="space-y-2">
          {levels.filter((l) => tierForLevel(l) === "topik-i").map((level) => (
            <LevelBlock key={level} level={level} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-bold text-learn-accent mb-2">{vi.lessons.topikII}</p>
        <div className="space-y-2">
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
    <div className="topik-card overflow-hidden">
      <div className="bg-learn-muted/50 px-4 py-2">
        <p className="text-sm font-bold text-learn-ink">{vi.lessons.level} {level}</p>
      </div>
      <div className="divide-y divide-learn-border">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/topik/lessons/${level}/${lesson.id}`}
            className="flex items-center gap-3 px-4 py-3 active:bg-learn-muted/30 transition-colors"
          >
            <span className="text-lg">
              {lesson.category === "writing" ? "✍️" : lesson.category === "reading" ? "📖" : lesson.category === "vocabulary" ? "📖" : "📐"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-learn-ink truncate">{lesson.titleVi}</p>
              <p className="text-[11px] text-learn-ink-muted">{lesson.durationMin} {vi.lessons.minutes}</p>
            </div>
            <span className="text-learn-primary text-sm">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
