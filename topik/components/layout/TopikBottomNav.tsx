"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/topik/lib/utils";
import { vi } from "@/topik/lib/i18n/vi";

const NAV = [
  { href: "/topik", label: vi.nav.home, icon: "🏠", match: (p: string) => p === "/topik" },
  { href: "/topik/lessons", label: vi.nav.lessons, icon: "📚", match: (p: string) => p.startsWith("/topik/lessons") },
  { href: "/topik/writing", label: vi.nav.writing, icon: "✍️", match: (p: string) => p.startsWith("/topik/writing") },
  { href: "/topik/practice", label: vi.nav.practice, icon: "📝", match: (p: string) => p.startsWith("/topik/practice") },
  { href: "/topik/review", label: vi.nav.review, icon: "🔄", match: (p: string) => p.startsWith("/topik/review") },
];

export function TopikBottomNav() {
  const pathname = usePathname();
  if (pathname.match(/\/topik\/lessons\/[^/]+\/[^/]+/)) return null;

  return (
    <nav className="topik-nav">
      <div className="mx-auto flex h-14 max-w-lg items-stretch">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn("topik-nav-item", active && "active")}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
