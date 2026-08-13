import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { getAllLevels, getCuratedVideoCount, getLessonsByLevel, tierForLevel } from "@/topik/lib/curriculum/lessons";
import { IconGrammar, IconReading, IconVocab, IconPen } from "@/topik/components/ui/TopikIcons";
import type { TopikLevel, LessonCategory } from "@/topik/types";

function LessonCategoryIcon({ category }: { category: LessonCategory }) {
  const iconClass = "text-learn-primary";
  switch (category) {
    case "writing":
      return <IconPen className={iconClass} size={18} />;
    case "reading":
      return <IconReading className={iconClass} size={18} />;
    case "vocabulary":
      return <IconVocab className={iconClass} size={18} />;
    default:
      return <IconGrammar className={iconClass} size={18} />;
  }
}

export default function LessonsIndexPage() {
  const levels = getAllLevels();

  return (
    <main className="topik-page">
      <TopikPageHeader
        title={vi.lessons.title}
        subtitle={`${getCuratedVideoCount()} video YouTube · TTMIK · Billy Korean · Seemile · ${vi.lessons.curatedNote}`}
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
    <div className="topik-mode-list">
      <div className="bg-[var(--topik-primary-soft)] px-4 py-2.5">
        <p className="text-sm font-semibold text-learn-primary">{vi.lessons.level} {level}</p>
      </div>
      {lessons.map((lesson) => (
        <Link
          key={lesson.id}
          href={`/topik/lessons/${level}/${lesson.id}`}
          className="topik-mode-row"
        >
          <span className="topik-mode-icon topik-mode-icon-primary topik-mode-icon-sm">
            <LessonCategoryIcon category={lesson.category} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-learn-ink truncate">{lesson.titleVi}</p>
            <p className="text-[11px] text-learn-ink-muted">{lesson.durationMin} {vi.lessons.minutes}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
