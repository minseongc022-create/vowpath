"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/learn/lib/utils";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import {
  IconHome,
  IconReview,
  IconStats,
  IconStudy,
  IconGear,
} from "@/topik/components/ui/TopikIcons";

export function TopikBottomNav() {
  const pathname = usePathname();
  const t = useTopikStrings();

  if (pathname.match(/\/topik\/lessons\/[^/]+\/[^/]+/)) return null;
  if (pathname.includes("/session")) return null;

  const NAV = [
    { href: "/topik", label: t.nav.home, Icon: IconHome, match: (p: string) => p === "/topik" },
    { href: "/topik/stats", label: t.nav.stats, Icon: IconStats, match: (p: string) => p.startsWith("/topik/stats") },
    {
      href: "/topik/study",
      label: t.nav.studyHub,
      Icon: IconStudy,
      match: (p: string) =>
        p.startsWith("/topik/study") ||
        p.startsWith("/topik/vocab") ||
        p.startsWith("/topik/grammar") ||
        p.startsWith("/topik/expression") ||
        p.startsWith("/topik/listening") ||
        p.startsWith("/topik/conversation"),
    },
    {
      href: "/topik/review",
      label: t.nav.review,
      Icon: IconReview,
      match: (p: string) => p.startsWith("/topik/review") || p.startsWith("/topik/wrong-notes"),
    },
    {
      href: "/topik/settings",
      label: t.modes.settings,
      Icon: IconGear,
      match: (p: string) => p.startsWith("/topik/settings"),
    },
  ];

  return (
    <div className="topik-nav-bar">
      <nav className="topik-nav-inner" aria-label={t.nav.main}>
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
              {active ? <span className="topik-nav-dot" aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
