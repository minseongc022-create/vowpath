import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";

type Mode = {
  href: string;
  title: string;
  desc: string;
  emoji: string;
  bgClass: string;
  featured?: boolean;
};

const MODES: Mode[] = [
  {
    href: "/topik/speaking",
    title: vi.home.speakingTitle,
    desc: vi.home.speakingDesc,
    emoji: "🎤",
    bgClass: "bg-[var(--topik-primary-soft)]",
    featured: true,
  },
  {
    href: "/topik/mock-exam",
    title: vi.home.mockExamTitle,
    desc: vi.home.mockExamDesc,
    emoji: "🖥️",
    bgClass: "bg-[var(--topik-blue-soft)]",
  },
  {
    href: "/topik/writing",
    title: vi.home.writingTitle,
    desc: vi.home.writingDesc,
    emoji: "✍️",
    bgClass: "bg-[var(--topik-coral-soft)]",
  },
  {
    href: "/topik/practice",
    title: vi.home.practiceTitle,
    desc: vi.home.practiceDesc,
    emoji: "📝",
    bgClass: "bg-[var(--topik-mint-soft)]",
  },
  {
    href: "/topik/lessons",
    title: vi.home.lessonsTitle,
    desc: vi.home.lessonsDesc,
    emoji: "📚",
    bgClass: "bg-[var(--topik-yellow-soft)]",
  },
  {
    href: "/topik/review",
    title: vi.home.reviewTitle,
    desc: vi.home.reviewDesc,
    emoji: "🔄",
    bgClass: "bg-[var(--topik-primary-soft)]",
  },
];

type Props = {
  srsTotal?: number;
  srsMastered?: number;
};

/** Malhaeboka-style 2-column mode grid with favorites */
export function StudyModeGrid({ srsTotal, srsMastered }: Props) {
  return (
    <section className="mb-5">
      <p className="topik-section-title mb-3">{vi.home.quickActions}</p>
      <div className="grid grid-cols-2 gap-3">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className={`topik-card topik-card-interactive flex flex-col gap-2.5 p-4 ${mode.featured ? "ring-2 ring-learn-primary/15" : ""}`}
          >
            <span className={`topik-icon-box ${mode.bgClass}`}>{mode.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-learn-ink leading-snug">{mode.title}</p>
              <p className="mt-0.5 text-[11px] text-learn-ink-muted leading-relaxed line-clamp-2">
                {mode.desc}
                {mode.href === "/topik/review" && srsTotal !== undefined
                  ? ` · ${srsTotal} thẻ · ${srsMastered} thuộc`
                  : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
