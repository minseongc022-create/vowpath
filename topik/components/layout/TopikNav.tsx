"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/learn/lib/utils";
import { vi } from "@/topik/lib/i18n/vi";
import {
  IconBook,
  IconHome,
  IconReview,
  IconStats,
  IconStudy,
} from "@/topik/components/ui/TopikIcons";

const NAV = [
  { href: "/topik", label: vi.nav.home, Icon: IconHome, match: (p: string) => p === "/topik" },
  { href: "/topik/stats", label: vi.nav.stats, Icon: IconStats, match: (p: string) => p.startsWith("/topik/stats") },
  {
    href: "/topik/study",
    label: vi.nav.studyHub,
    Icon: IconStudy,
    match: (p: string) =>
      p.startsWith("/topik/study") ||
      p.startsWith("/topik/speaking") ||
      p.startsWith("/topik/writing") ||
      p.startsWith("/topik/practice") ||
      p.startsWith("/topik/mock-exam"),
  },
  {
    href: "/topik/lessons",
    label: vi.nav.lessons,
    Icon: IconBook,
    match: (p: string) => p.startsWith("/topik/lessons"),
  },
  {
    href: "/topik/review",
    label: vi.nav.review,
    Icon: IconReview,
    match: (p: string) => p.startsWith("/topik/review") || p.startsWith("/topik/wrong-notes"),
  },
] as const;

export function TopikSidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("topik-sidebar-nav", className)} aria-label={vi.nav.main}>
      {NAV.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("topik-sidebar-link", active && "topik-sidebar-link-active")}
          >
            <item.Icon active={active} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TopikBottomNav() {
  const pathname = usePathname();
  if (pathname.match(/\/topik\/lessons\/[^/]+\/[^/]+/)) return null;

  return (
    <div className="topik-nav-bar lg:hidden">
      <nav className="topik-nav-inner" aria-label={vi.nav.main}>
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("topik-nav-item", active && "topik-nav-item-active")}
            >
              <item.Icon active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
