"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/learn/lib/utils";
import { vi } from "@/topik/lib/i18n/vi";

const NAV = [
  { href: "/topik", label: vi.nav.home, match: (p: string) => p === "/topik" },
  { href: "/topik/lessons", label: vi.nav.lessons, match: (p: string) => p.startsWith("/topik/lessons") },
  { href: "/topik/writing", label: vi.nav.writing, match: (p: string) => p.startsWith("/topik/writing") },
  { href: "/topik/practice", label: vi.nav.practice, match: (p: string) => p.startsWith("/topik/practice") },
  { href: "/topik/review", label: vi.nav.review, match: (p: string) => p.startsWith("/topik/review") },
];

export function TopikBottomNav() {
  const pathname = usePathname();
  if (pathname.match(/\/topik\/lessons\/[^/]+\/[^/]+/)) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-learn-surface/95 backdrop-blur-lg border-t border-learn-border"
      style={{ paddingBottom: "var(--learn-safe-bottom)" }}
    >
      <div className="flex items-stretch justify-around h-14 max-w-lg mx-auto">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors active:scale-95 px-0.5",
                active ? "text-learn-primary" : "text-learn-ink-muted",
              )}
            >
              <span className="text-base leading-none">
                {item.href === "/topik" && "🏠"}
                {item.href === "/topik/lessons" && "📚"}
                {item.href === "/topik/writing" && "✍️"}
                {item.href === "/topik/practice" && "📝"}
                {item.href === "/topik/review" && "🔄"}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
