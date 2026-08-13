import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { getAllLevels, getLessonsByLevel, tierForLevel } from "@/topik/lib/curriculum/lessons";
import type { TopikLevel } from "@/topik/types";

export default function LessonsIndexPage() {
  const levels = getAllLevels();

  return (
    <main className="mx-auto max-w-lg px-4 py-6 topik-animate-in">
      <h1 className="text-xl font-extrabold">{vi.lessons.title}</h1>
      <p className="mt-1 text-sm text-[var(--topik-ink-muted)]">Video · Từ vựng · Ngữ pháp · TOPIK 1→6</p>

      <section className="mt-6">
        <p className="text-xs font-bold text-[var(--topik-primary)] mb-2">{vi.lessons.topikI}</p>
        <div className="space-y-2">
          {levels.filter((l) => tierForLevel(l) === "topik-i").map((level) => (
            <LevelBlock key={level} level={level} />
          ))}
        </div>
      </section>

      <section className="mt-6 pb-4">
        <p className="text-xs font-bold text-[var(--topik-accent)] mb-2">{vi.lessons.topikII}</p>
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
      <div className="bg-[var(--topik-muted)] px-4 py-2">
        <p className="text-sm font-bold">{vi.lessons.level} {level}</p>
      </div>
      <div className="divide-y divide-[var(--topik-border)]">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/topik/lessons/${level}/${lesson.id}`}
            prefetch
            className="flex items-center gap-3 px-4 py-3 active:bg-[var(--topik-muted)] transition-colors"
          >
            <span className="text-lg">
              {lesson.category === "writing" ? "✍️" : lesson.category === "reading" ? "📖" : "📐"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{lesson.titleVi}</p>
              <p className="text-[11px] text-[var(--topik-ink-muted)]">{lesson.durationMin} {vi.lessons.minutes}</p>
            </div>
            <span className="text-[var(--topik-primary)] text-sm font-bold">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
