"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/learn/lib/utils";
import { TOPIK_BRAND } from "@/topik/lib/brand";
import { STUDY_MODES } from "@/topik/lib/study-modes";
import { vi } from "@/topik/lib/i18n/vi";
import {
  IconBook,
  IconChevronRight,
  IconClose,
  IconFlame,
  IconHome,
  IconMenu,
  IconReview,
  IconStats,
  IconStudy,
  StudyModeIcon,
} from "@/topik/components/ui/TopikIcons";

type Props = {
  streak?: number;
  targetLevel?: number;
};

export function TopikHeader({ streak = 0, targetLevel = 2 }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-learn-border bg-learn-surface/95 backdrop-blur-md">
        <div className="topik-page flex h-12 items-center justify-between !py-0">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-learn-ink-muted active:bg-learn-muted"
            aria-label={vi.menu.open}
          >
            <IconMenu />
          </button>

          <Link href="/topik" className="text-sm font-semibold text-learn-ink">
            {TOPIK_BRAND.name}
          </Link>

          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--topik-gold-soft)] px-2 py-1 text-xs font-semibold text-[var(--topik-gold)]">
                <IconFlame />
                {streak}
              </span>
            )}
            <span className="topik-badge">TOPIK {targetLevel}</span>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="topik-menu-overlay" onClick={() => setMenuOpen(false)} aria-hidden />
          <nav className="topik-menu-panel" aria-label={vi.menu.title}>
            <div className="flex items-center justify-between border-b border-learn-border px-4 py-4">
              <p className="text-base font-semibold text-learn-ink">{vi.menu.title}</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-learn-ink-muted active:bg-learn-muted"
                aria-label={vi.menu.close}
              >
                <IconClose />
              </button>
            </div>
            <div className="topik-mode-list mx-3 my-3 !border-0 !shadow-none">
              {STUDY_MODES.map((mode) => (
                <Link
                  key={mode.href}
                  href={mode.href}
                  className={cn(
                    "topik-mode-row",
                    pathname.startsWith(mode.href) && "bg-[var(--topik-primary-soft)]",
                  )}
                >
                  <StudyModeIcon id={mode.id} tint={mode.tint} />
                  <span className="flex-1 text-sm font-medium text-learn-ink">{mode.title}</span>
                  <IconChevronRight className="text-learn-ink-subtle" />
                </Link>
              ))}
            </div>
            <div className="absolute bottom-0 inset-x-0 border-t border-learn-border px-4 py-4">
              <p className="text-xs text-learn-ink-muted leading-relaxed">{vi.menu.tagline}</p>
            </div>
          </nav>
        </>
      )}
    </>
  );
}