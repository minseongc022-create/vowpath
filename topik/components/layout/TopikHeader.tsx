"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/learn/lib/utils";
import { TOPIK_BRAND } from "@/topik/lib/brand";
import { vi } from "@/topik/lib/i18n/vi";
import { IconClose, IconMenu } from "@/topik/components/ui/TopikIcons";

const MENU_LINKS = [
  { href: "/topik/speaking", label: vi.nav.speaking, emoji: "🎤" },
  { href: "/topik/writing", label: vi.nav.writing, emoji: "✍️" },
  { href: "/topik/mock-exam", label: vi.nav.mockExam, emoji: "🖥️" },
  { href: "/topik/practice", label: vi.nav.practice, emoji: "📝" },
  { href: "/topik/wrong-notes", label: vi.nav.wrongNotes, emoji: "📋" },
  { href: "/topik/stats", label: vi.nav.stats, emoji: "📊" },
];

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
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-learn-bg/80 backdrop-blur-xl">
        <div className="topik-page flex h-14 items-center justify-between !py-0">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-learn-ink-muted transition-colors active:bg-learn-muted"
            aria-label={vi.menu.open}
          >
            <IconMenu />
          </button>

          <Link href="/topik" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-learn-primary to-[#a29bfe] text-sm font-bold text-white shadow-md">
              T
            </span>
            <span className="text-sm font-semibold text-learn-ink">{TOPIK_BRAND.name}</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-[var(--topik-yellow-soft)] px-2 py-1 text-xs font-semibold text-[#f39c12]">
                🔥 {streak}
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
            <div className="px-3 py-3">
              <p className="px-3 pb-2 text-xs font-semibold text-learn-ink-subtle">{vi.menu.allModes}</p>
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors active:bg-learn-muted",
                    pathname.startsWith(link.href) ? "bg-[var(--topik-purple-soft)] text-learn-primary" : "text-learn-ink",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-learn-muted text-lg">
                    {link.emoji}
                  </span>
                  {link.label}
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
