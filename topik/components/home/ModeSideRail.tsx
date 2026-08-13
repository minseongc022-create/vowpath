"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { LEARNING_MODES, type LearningModeId } from "@/topik/lib/learning-modes";
import {
  IconChat,
  IconGear,
  IconGrammar,
  IconHeadphones,
  IconPerson,
  IconSparkle,
} from "@/topik/components/ui/TopikIcons";
import { cn } from "@/learn/lib/utils";

const MODE_ICONS: Record<LearningModeId, React.ComponentType<{ className?: string }>> = {
  vocab: IconPerson,
  conversation: IconChat,
  grammar: IconGrammar,
  expression: IconSparkle,
  listening: IconHeadphones,
  settings: IconGear,
};

type Props = {
  activeMode?: LearningModeId;
  dailyGoal?: number;
  progressPct?: number;
};

/** Malhaeboka 6-button vertical side rail */
export function ModeSideRail({ activeMode = "vocab", dailyGoal = 10, progressPct = 0 }: Props) {
  const t = useTopikStrings();

  const labels: Record<LearningModeId, string> = {
    vocab: t.modes.vocabShort,
    conversation: t.modes.conversationShort,
    grammar: t.modes.grammarShort,
    expression: t.modes.expressionShort,
    listening: t.modes.listeningShort,
    settings: t.modes.settings,
  };

  return (
    <div className="topik-side-rail">
      {LEARNING_MODES.map((mode) => {
        const Icon = MODE_ICONS[mode.id];
        const active = mode.id === activeMode;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            className={cn("topik-side-rail-btn", mode.railClass, active && "topik-side-rail-btn-active")}
            aria-label={labels[mode.id]}
            title={labels[mode.id]}
          >
            <Icon className="topik-side-rail-icon" />
          </Link>
        );
      })}
    </div>
  );
}
