"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBriefing,
  IconCalendar,
  IconDashboard,
  IconDiamond,
  IconMissedCalls,
  IconRequests,
  IconSettings,
} from "@/components/dashboard/DashboardNavIcons";
import { DashboardLocaleToggle } from "@/components/layout/DashboardLocaleToggle";
import { EffiroadAiMark } from "@/components/brand/EffiroadAiMark";
import { openEffiroadAssistant } from "@/lib/assistant-events";
import { ROUTES } from "@/lib/constants";
import { useLocale, useVowDashboard } from "@/components/providers/LocaleProvider";
import { useUserPlan } from "@/lib/hooks/use-user-plan";
import { planNavCtaEn, planNavCtaKo } from "@/lib/plan-nav-label";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
  badge?: number;
};

function IconMenu({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </svg>
  );
}

export function DashboardMobileNav({
  pendingReviewCount = 0,
}: {
  pendingReviewCount?: number;
}) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const userPlan = useUserPlan();
  const vowDashboard = useVowDashboard();
  const v = vowDashboard.nav;
  const planLabel = locale === "ko" ? planNavCtaKo(userPlan) : planNavCtaEn(userPlan);
  const [moreOpen, setMoreOpen] = useState(false);

  const morePaths = [
    ROUTES.missedCallsAnalytics,
    ROUTES.briefing,
    ROUTES.settings,
  ];
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
      icon: <IconDashboard className="h-5 w-5" />,
    },
    {
      href: `${ROUTES.dashboard}/bookings`,
      label: v.requests,
      match: (p) => p.startsWith(`${ROUTES.dashboard}/bookings`),
      icon: <IconRequests className="h-5 w-5" />,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    {
      href: ROUTES.calendar,
      label: v.calendar,
      match: (p) => p.startsWith(ROUTES.calendar),
      icon: <IconCalendar className="h-5 w-5" />,
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
      href: ROUTES.settings,
      label: v.settings,
      icon: <IconSettings className="h-5 w-5" />,
      match: (p: string) => p.startsWith(ROUTES.settings),
    },
    {
      href: ROUTES.pricing,
      label: planLabel,
      icon: <IconDiamond className="h-5 w-5" />,
      match: (p: string) => p.startsWith(ROUTES.pricing),
    },
  ];

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-brand-950/35 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <div
          className="kb-more-sheet fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-2 lg:hidden"
          role="dialog"
          aria-label="All menu"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-brand-200" aria-hidden />
          <p className="mb-2 text-center text-xs font-bold text-brand-950">All menus</p>
          <div className="mb-3 flex justify-center">
            <DashboardLocaleToggle />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {moreLinks.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  className={`kb-more-grid-item ${active ? "ring-2 ring-brand-400/60" : ""}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      active ? "bg-brand-100 text-brand-800" : "bg-brand-50 text-stone-600"
                    }`}
                  >
                    {link.icon}
                  </span>
                  <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-stone-700">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-50 px-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex w-full max-w-none items-end gap-1.5">
          <nav className="kb-floating-nav min-w-0 flex-1">
            <ul className="flex items-center justify-between px-0.5 py-0.5">
              {tabs.map((tab) => {
                const active = tab.match(pathname);
                return (
                  <li key={tab.href} className="flex-1">
                    <Link
                      href={tab.href}
                      prefetch
                      className={`relative flex min-h-[2.75rem] flex-col items-center justify-center gap-0 px-0.5 py-1 text-[9px] font-bold transition ${
                        active ? "text-brand-900" : "text-stone-400"
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
                        <span className="absolute right-1 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                          {tab.badge > 9 ? "9+" : tab.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
              <li className="shrink-0 px-1">
                <button
                  type="button"
                  className={`kb-nav-all-btn ${moreOpen || moreActive ? "ring-2 ring-brand-300" : ""}`}
                  aria-expanded={moreOpen}
                  aria-label="All menus"
                  onClick={() => setMoreOpen((o) => !o)}
                >
                  <IconMenu />
                </button>
              </li>
            </ul>
          </nav>

          <button
            type="button"
            data-tour-step="sidebar-ai"
            className="kb-nav-ai-btn !relative !h-auto !w-auto !rounded-full !border-0 !bg-transparent !p-0 !shadow-none"
            aria-label="Effiroad AI"
            onClick={() => {
              setMoreOpen(false);
              openEffiroadAssistant();
            }}
          >
            <EffiroadAiMark size={44} shadow="md" />
            {pathname.startsWith(ROUTES.ai) ? (
              <span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
            ) : null}
          </button>
        </div>
      </div>
    </>
  );
}
