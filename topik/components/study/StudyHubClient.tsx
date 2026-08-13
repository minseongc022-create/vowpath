"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { LEARNING_MODES, STUDY_HUB_MODES } from "@/topik/lib/learning-modes";
import { STUDY_MODES } from "@/topik/lib/study-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import {
  IconChevronRight,
  IconGrammar,
  IconHeadphones,
  IconMic,
  IconNotebook,
  IconPerson,
  IconSparkle,
  IconChat,
  StudyModeIcon,
} from "@/topik/components/ui/TopikIcons";
import { cn } from "@/learn/lib/utils";

const MODE_ICON_MAP = {
  vocab: IconPerson,
  conversation: IconChat,
  grammar: IconGrammar,
  expression: IconSparkle,
  listening: IconHeadphones,
} as const;

function StudyHubInner() {
  const t = useTopikStrings();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeMode = params.get("mode") ?? "vocab";

  const modeLabels: Record<string, string> = {
    vocab: t.modes.vocabShort,
    conversation: t.modes.conversationShort,
    grammar: t.modes.grammarShort,
    expression: t.modes.expressionShort,
    listening: t.modes.listeningShort,
  };

  const active = STUDY_HUB_MODES.find((m) => m.id === activeMode) ?? STUDY_HUB_MODES[0]!;
  const ModeIcon = MODE_ICON_MAP[active.id as keyof typeof MODE_ICON_MAP] ?? IconPerson;

  const secondaryItems = [
    { href: "/topik/review", label: t.studyHub.mySentences, icon: IconSparkle, tint: "coral" },
    { href: "/topik/wrong-notes", label: t.studyHub.myWrongNotes, icon: IconNotebook, tint: "mint" },
    { href: "/topik/review", label: t.studyHub.learnedVocab, icon: IconGrammar, tint: "blue" },
    { href: "/topik/review", label: t.studyHub.myWordbook, icon: IconNotebook, tint: "primary" },
    { href: "/topik/speaking", label: t.studyHub.aiQa, icon: IconMic, tint: "gold" },
  ];

  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={t.studyHub.title} />

      <p className="topik-section-title mb-2">{t.studyHub.modeSection}</p>
      <div className="topik-mode-chips mb-4">
        {STUDY_HUB_MODES.map((mode) => (
          <Link
            key={mode.id}
            href={`/topik/study?mode=${mode.id}`}
            className={cn("topik-mode-chip", active.id === mode.id && "topik-mode-chip-active")}
          >
            {modeLabels[mode.id]}
          </Link>
        ))}
      </div>

      <Link href={active.href} className="topik-study-hero mb-4">
        <div>
          <p className="text-lg font-bold text-white">{t.modes[active.id as keyof typeof t.modes]}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
            {t.studyHub.dailyGoalItems.replace("{n}", "10")}
          </p>
        </div>
        <span className="topik-study-play">
          <ModeIcon className="text-white" size={28} />
        </span>
      </Link>

      <div className="topik-mode-list mb-6">
        {secondaryItems.map((item) => (
          <Link key={item.label} href={item.href} className="topik-mode-row">
            <span className={`topik-mode-icon topik-mode-icon-${item.tint}`}>
              <item.icon size={20} />
            </span>
            <span className="flex-1 text-sm font-medium text-learn-ink">{item.label}</span>
            <IconChevronRight className="text-learn-ink-subtle" />
          </Link>
        ))}
      </div>

      <p className="topik-section-title mb-2">{t.studyHub.other}</p>
      <div className="topik-mode-list mb-6">
        <Link href="/topik/speaking" className="topik-mode-row">
          <span className="topik-mode-icon topik-mode-icon-primary">
            <IconMic size={20} />
          </span>
          <span className="flex-1 text-sm font-medium">{t.studyHub.pronunciation}</span>
          <IconChevronRight className="text-learn-ink-subtle" />
        </Link>
      </div>

      <p className="topik-section-title mb-2">TOPIK</p>
      <div className="topik-mode-list">
        {STUDY_MODES.slice(0, 4).map((mode) => (
          <Link
            key={mode.id}
            href={mode.href}
            className={cn("topik-mode-row", pathname.startsWith(mode.href) && "bg-[var(--topik-primary-soft)]")}
          >
            <StudyModeIcon id={mode.id} tint={mode.tint} compact />
            <span className="flex-1 text-sm font-medium">{mode.title}</span>
            <IconChevronRight className="text-learn-ink-subtle" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function StudyHubClient() {
  return (
    <Suspense fallback={<p className="text-learn-ink-muted">…</p>}>
      <StudyHubInner />
    </Suspense>
  );
}
