"use client";

import { TOPIK_BRAND } from "@/topik/lib/brand";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { TopikBottomNav, TopikSidebarNav } from "@/topik/components/layout/TopikNav";
import { TopikHeader } from "@/topik/components/layout/TopikHeader";
import { useTopikFocus, TopikFocusBar } from "@/topik/components/focus/TopikFocusProvider";

type Props = {
  children: React.ReactNode;
  streak?: number;
  targetLevel?: number;
};

export function TopikAppChromeClient({ children, streak, targetLevel }: Props) {
  const vi = useTopikVi();

  const { isFocused } = useTopikFocus();

  if (isFocused) {
    return (
      <div className="topik-shell topik-shell--focus">
        <TopikFocusBar />
        <div className="topik-main-column topik-main-column--focus">
          <div className="topik-main-scroll topik-main-scroll--focus">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="topik-shell">
      <aside className="topik-sidebar hidden lg:flex">
        <div className="topik-sidebar-brand">
          <p className="text-base font-bold text-learn-ink">{TOPIK_BRAND.name}</p>
          <p className="mt-0.5 text-xs text-learn-ink-muted leading-snug">{TOPIK_BRAND.tagline}</p>
        </div>
        <TopikSidebarNav className="flex-1" />
        {targetLevel != null && (
          <p className="topik-sidebar-footer text-xs text-learn-ink-muted">
            {vi.home.targetLevel} · TOPIK {targetLevel}
          </p>
        )}
      </aside>

      <div className="topik-main-column">
        <TopikHeader streak={streak} targetLevel={targetLevel} />
        <div className="topik-main-scroll pb-[calc(var(--topik-nav-height)+1rem+var(--learn-safe-bottom))] lg:pb-8">
          {children}
        </div>
        <TopikBottomNav />
      </div>
    </div>
  );
}
