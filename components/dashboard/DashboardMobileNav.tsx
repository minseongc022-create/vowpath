"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBriefing,
  IconCalendar,
  IconDashboard,
  IconEffiroadAi,
  IconMissedCalls,
  IconRequests,
  IconSettings,
} from "@/components/dashboard/DashboardNavIcons";
import { ROUTES } from "@/lib/constants";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

type Tab = {
  href?: string;
  label: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
  badge?: number;
  action?: "more";
};

function IconMore({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function DashboardMobileNav({
  pendingReviewCount = 0,
}: {
  pendingReviewCount?: number;
}) {
  const pathname = usePathname();
  const v = useVowDashboard().nav;
  const [moreOpen, setMoreOpen] = useState(false);

  const morePaths = [ROUTES.missedCallsAnalytics, ROUTES.briefing, ROUTES.ai];
  const moreActive = morePaths.some((p) => pathname.startsWith(p));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

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
      label: "More",
      match: () => moreActive,
      icon: <IconMore className="h-6 w-6" />,
      action: "more",
    },
    {
      href: ROUTES.settings,
      label: v.settings,
      match: (p) => p.startsWith(ROUTES.settings),
      icon: <IconSettings className="h-6 w-6" />,
    },
  ];

  const moreLinks = [
    {
      href: ROUTES.missedCallsAnalytics,
      label: v.missedCalls,
      icon: <IconMissedCalls className="h-5 w-5" />,
      match: (p: string) => p.startsWith(ROUTES.missedCallsAnalytics),
    },
    {
      href: ROUTES.briefing,
      label: v.briefing,
      icon: <IconBriefing className="h-5 w-5" />,
      match: (p: string) => p.startsWith(ROUTES.briefing),
    },
    {
      href: ROUTES.ai,
      label: v.ai,
      icon: <IconEffiroadAi className="h-5 w-5" />,
      match: (p: string) => p.startsWith(ROUTES.ai),
    },
  ];

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-brand-950/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <div
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 rounded-t-2xl border border-brand-200 bg-white px-4 py-3 shadow-[0_-8px_32px_rgb(0_0_0/0.12)] lg:hidden"
          role="dialog"
          aria-label="More navigation"
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-brand-200" aria-hidden />
          <ul className="space-y-1">
            {moreLinks.map((link) => {
              const active = link.match(pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch
                    className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                      active ? "bg-brand-100 text-brand-900" : "text-stone-700 hover:bg-brand-50"
                    }`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        active ? "bg-white text-brand-800" : "bg-brand-50 text-stone-600"
                      }`}
                    >
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <nav
        className="vow-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t border-brand-200/80 bg-white/95 backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const active = tab.action === "more" ? moreOpen || moreActive : tab.match(pathname);

            if (tab.action === "more") {
              return (
                <li key="more" className="flex-1">
                  <button
                    type="button"
                    className={`relative flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-semibold transition ${
                      active ? "text-brand-800" : "text-stone-500"
                    }`}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((o) => !o)}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                        active ? "bg-brand-100 text-brand-800" : "text-stone-500"
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span className="max-w-full truncate">{tab.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href!}
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
    </>
  );
}
