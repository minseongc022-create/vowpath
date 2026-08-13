"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { TOPIK_SKILLS, type SkillId } from "@/topik/lib/skills";
import { STUDY_MODES } from "@/topik/lib/study-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { IconChevronRight, StudyModeIcon } from "@/topik/components/ui/TopikIcons";
import { cn } from "@/learn/lib/utils";

const SKILL_LABELS: Record<SkillId, "vocabShort" | "grammarShort" | "conversationShort" | "expressionShort" | "listeningShort"> = {
  vocab: "vocabShort",
  grammar: "grammarShort",
  conversation: "conversationShort",
  expression: "expressionShort",
  listening: "listeningShort",
};

function StudyHubInner() {
  const { locale, t } = useTopikLocale();
  const params = useSearchParams();
  const activeId = (params.get("skill") as SkillId) ?? "vocab";
  const active = TOPIK_SKILLS.find((s) => s.id === activeId) ?? TOPIK_SKILLS[0]!;

  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={t.studyHub.title} subtitle="5 kỹ năng + công cụ TOPIK" />

      <div className="topik-mode-chips mb-4">
        {TOPIK_SKILLS.map((skill) => (
          <Link
            key={skill.id}
            href={`/topik/study?skill=${skill.id}`}
            className={cn("topik-mode-chip", active.id === skill.id && "topik-mode-chip-active")}
          >
            {t.modes[SKILL_LABELS[skill.id]]}
          </Link>
        ))}
      </div>

      <div className="topik-card mb-5 p-4">
        <p className="text-base font-bold text-learn-ink">
          {t.modes[active.id as keyof typeof t.modes]}
        </p>
        <p className="mt-1 text-xs text-learn-ink-muted">
          {locale === "vi" ? active.focusVi : active.focusEn}
        </p>
        <Link href={active.sessionHref} className="topik-btn topik-btn-primary topik-btn-md mt-4 w-full">
          {t.home.todayMode}
        </Link>
      </div>

      <p className="topik-section-title mb-2">Công cụ TOPIK</p>
      <div className="topik-mode-list">
        {STUDY_MODES.map((mode) => (
          <Link key={mode.id} href={mode.href} className="topik-mode-row">
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
    <Suspense fallback={null}>
      <StudyHubInner />
    </Suspense>
  );
}
