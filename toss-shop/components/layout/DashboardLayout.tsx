"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

const NAV = [
  { href: SP_ROUTES.dashboard, label: SP_STRINGS.navDashboard, match: (p: string) => p === SP_ROUTES.dashboard },
  { href: SP_ROUTES.discovery, label: "발굴", match: (p: string) => p.includes("/discovery") },
  { href: SP_ROUTES.keywords, label: "키워드", match: (p: string) => p.includes("/keywords") },
  { href: SP_ROUTES.rankings, label: "랭킹", match: (p: string) => p.includes("/rankings") },
  { href: SP_ROUTES.settlements, label: "정산", match: (p: string) => p.includes("/settlements") || p.includes("/competitors") || p.includes("/settings") },
] as const;

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="ts-mobile-nav" aria-label="대시보드 메뉴">
      <div className="ts-mobile-nav-inner">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "ts-mobile-nav-item ts-mobile-nav-item-active" : "ts-mobile-nav-item"}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashboardPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sp-dashboard mx-auto max-w-6xl px-4 py-5 sm:py-8">
      <header className="ts-page-header mb-4">
        <h1 className="ts-page-title">{title}</h1>
        {description && <p className="ts-page-desc">{description}</p>}
      </header>
      {children}
    </div>
  );
}
