"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/learn/lib/utils";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import {
  IconHome,
  IconMonitor,
  IconNotebook,
  IconStudy,
} from "@/topik/components/ui/TopikIcons";
import type { ViStrings } from "@/topik/lib/i18n/strings";

function getNav(vi: ViStrings) {
  return [
    { href: "/topik", label: vi.nav.home, Icon: IconHome, match: (p: string) => p === "/topik" },
    {
      href: "/topik/drill",
      label: vi.drill.navShort,
      Icon: IconStudy,
      match: (p: string) => p.startsWith("/topik/drill"),
    },
    {
      href: "/topik/practice",
      label: vi.nav.practice,
      Icon: IconNotebook,
      match: (p: string) =>
        p.startsWith("/topik/practice") ||
        p.startsWith("/topik/placement") ||
        p.startsWith("/topik/wrong-notes"),
    },
    {
      href: "/topik/mock-exam",
      label: vi.nav.mockExam,
      Icon: IconMonitor,
      match: (p: string) => p.startsWith("/topik/mock-exam"),
    },
  ] as const;
}

export function TopikSidebarNav({ className }: { className?: string }) {
  const vi = useTopikVi();
  const nav = getNav(vi);
  const pathname = usePathname();

  return (
    <nav className={cn("topik-sidebar-nav", className)} aria-label={vi.nav.main}>
      {nav.map((item) => {
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
  const vi = useTopikVi();
  const nav = getNav(vi);
  const pathname = usePathname();
  if (pathname.match(/\/topik\/lessons\/[^/]+\/[^/]+/)) return null;

  return (
    <div className="topik-nav-bar lg:hidden">
      <nav className="topik-nav-inner" aria-label={vi.nav.main}>
        {nav.map((item) => {
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
