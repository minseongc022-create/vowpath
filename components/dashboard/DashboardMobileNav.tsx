"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconDashboard,
  IconRequests,
  IconSettings,
} from "@/components/dashboard/DashboardNavIcons";
import { ROUTES } from "@/lib/constants";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
  badge?: number;
};

export function DashboardMobileNav({
  pendingReviewCount = 0,
}: {
  pendingReviewCount?: number;
}) {
  const pathname = usePathname();
  const v = useVowDashboard().nav;

  const tabs: Tab[] = [
    {
      href: ROUTES.dashboard,
      label: v.dashboard,
      match: (p) => p === ROUTES.dashboard,
      icon: <IconDashboard className="h-6 w-6" />,
    },
    {
      href: `${ROUTES.dashboard}/bookings`,
      label: v.requests,
      match: (p) => p.startsWith(`${ROUTES.dashboard}/bookings`),
      icon: <IconRequests className="h-6 w-6" />,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    {
      href: ROUTES.calendar,
      label: v.calendar,
      match: (p) => p.startsWith(ROUTES.calendar),
      icon: <IconCalendar className="h-6 w-6" />,
    },
    {
      href: ROUTES.settings,
      label: v.settings,
      match: (p) => p.startsWith(ROUTES.settings),
      icon: <IconSettings className="h-6 w-6" />,
    },
  ];

  return (
    <nav
      className="vow-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t border-brand-200/80 bg-white/95 backdrop-blur-md lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                prefetch
                className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-semibold transition ${
                  active ? "text-brand-800" : "text-stone-500"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    active ? "bg-brand-100 text-brand-800" : "text-stone-500"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="max-w-full truncate">{tab.label}</span>
                {tab.badge ? (
                  <span className="absolute right-[calc(50%-1.25rem)] top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
