import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";

const STUDY_MODES = [
  {
    href: "/topik/speaking",
    title: vi.home.speakingTitle,
    desc: vi.home.speakingDesc,
    emoji: "🎤",
    bg: "bg-[var(--topik-purple-soft)]",
  },
  {
    href: "/topik/writing",
    title: vi.home.writingTitle,
    desc: vi.home.writingDesc,
    emoji: "✍️",
    bg: "bg-[var(--topik-coral-soft)]",
  },
  {
    href: "/topik/practice",
    title: vi.home.practiceTitle,
    desc: vi.home.practiceDesc,
    emoji: "📝",
    bg: "bg-[var(--topik-mint-soft)]",
  },
  {
    href: "/topik/mock-exam",
    title: vi.home.mockExamTitle,
    desc: vi.home.mockExamDesc,
    emoji: "🖥️",
    bg: "bg-[var(--topik-blue-soft)]",
  },
  {
    href: "/topik/lessons",
    title: vi.home.lessonsTitle,
    desc: vi.home.lessonsDesc,
    emoji: "📚",
    bg: "bg-[var(--topik-yellow-soft)]",
  },
  {
    href: "/topik/review",
    title: vi.home.reviewTitle,
    desc: vi.home.reviewDesc,
    emoji: "🔄",
    bg: "bg-[var(--topik-purple-soft)]",
  },
  {
    href: "/topik/wrong-notes",
    title: vi.nav.wrongNotes,
    desc: vi.wrongNotes.empty.replace("Chưa có câu sai. ", ""),
    emoji: "📋",
    bg: "bg-learn-muted",
  },
];

/** Malhaeboka "전체 학습" tab — all study modes in one place */
export function StudyHubClient() {
  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={vi.studyHub.title} subtitle={vi.studyHub.subtitle} />
      <div className="space-y-3">
        {STUDY_MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="topik-card topik-card-interactive flex items-center gap-4 p-4"
          >
            <span className={`topik-icon-box ${mode.bg}`}>{mode.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-learn-ink">{mode.title}</p>
              <p className="mt-0.5 text-xs text-learn-ink-muted leading-relaxed">{mode.desc}</p>
            </div>
            <span className="text-learn-ink-subtle">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
