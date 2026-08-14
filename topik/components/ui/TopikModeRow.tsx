import Link from "next/link";
import type { StudyMode } from "@/topik/lib/study-modes";
import { IconChevronRight, StudyModeIcon } from "@/topik/components/ui/TopikIcons";

/** Malhaeboka "전체 학습" list row — icon + title + chevron */
export function TopikModeRow({ mode }: { mode: StudyMode }) {
  return (
    <Link href={mode.href} className="topik-mode-row">
      <StudyModeIcon id={mode.id} tint={mode.tint} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-learn-ink leading-snug">{mode.title}</p>
        <p className="mt-0.5 text-xs text-learn-ink-muted leading-relaxed line-clamp-2">{mode.desc}</p>
      </div>
      <IconChevronRight className="shrink-0 text-learn-ink-subtle" />
    </Link>
  );
}

/** Compact tile for home favorites grid */
export function TopikModeTile({ mode, extra }: { mode: StudyMode; extra?: string }) {
  return (
    <Link href={mode.href} className="topik-mode-tile">
      <StudyModeIcon id={mode.id} tint={mode.tint} compact />
      <p className="topik-mode-tile-title">{mode.title}</p>
      <p className="topik-mode-tile-desc">
        {mode.desc}
        {extra ? ` · ${extra}` : ""}
      </p>
    </Link>
  );
}
