"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import {
  IconBooks,
  IconChevronRight,
  IconNotebook,
  IconReading,
  IconVocab,
} from "@/topik/components/ui/TopikIcons";

/** Malhaeboka home quick links row */
export function HomeQuickLinks() {
  const t = useTopikStrings();

  const links = [
    { href: "/topik/premium", label: t.home.shop, Icon: IconBooks, tint: "primary" as const },
    { href: "/topik/league", label: t.home.challenges, Icon: IconReading, tint: "gold" as const },
    { href: "/topik/study", label: t.home.dictionary, Icon: IconVocab, tint: "blue" as const },
    { href: "/topik/review", label: t.home.myWordbook, Icon: IconNotebook, tint: "coral" as const },
  ];

  return (
    <div className="topik-quick-links">
      {links.map(({ href, label, Icon, tint }) => (
        <Link key={href} href={href} className="topik-quick-link">
          <span className={`topik-mode-icon topik-mode-icon-${tint} topik-mode-icon-sm`}>
            <Icon size={18} />
          </span>
          <span className="text-[10px] font-semibold text-learn-ink-muted">{label}</span>
        </Link>
      ))}
    </div>
  );
}

type LearningInfoProps = {
  weeklyMinutes?: number;
  weeklyQuestions?: number;
};

/** Malhaeboka 학습 정보 card with weekly chart */
export function LearningInfoCard({ weeklyMinutes = 0, weeklyQuestions = 0 }: LearningInfoProps) {
  const t = useTopikStrings();
  const bars = [20, 35, 15, 60, 40, 25, 45];
  const todayIdx = new Date().getDay();
  const idx = todayIdx === 0 ? 6 : todayIdx - 1;

  return (
    <Link href="/topik/stats" className="topik-learning-info">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-learn-ink">{t.home.learningInfo}</p>
        <IconChevronRight className="text-learn-ink-subtle" />
      </div>

      <div className="topik-legend mt-3">
        {[
          { color: "var(--learn-primary)", label: t.modes.vocabShort },
          { color: "var(--topik-blue)", label: t.modes.grammarShort },
          { color: "var(--topik-coral)", label: t.modes.expressionShort },
          { color: "var(--learn-accent)", label: t.modes.conversationShort },
          { color: "var(--topik-gold)", label: t.modes.listeningShort },
        ].map(({ color, label }) => (
          <span key={label} className="topik-legend-item">
            <span className="topik-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <div className="topik-week-chart mt-4">
        {bars.map((h, i) => (
          <div key={i} className="topik-week-bar-col">
            <div
              className={`topik-week-bar ${i === idx ? "topik-week-bar-active" : ""}`}
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>

      <div className="topik-learning-info-footer">
        <span>{weeklyMinutes} phút</span>
        <span className="topik-divider-v" />
        <span>{weeklyQuestions} câu</span>
      </div>
    </Link>
  );
}
