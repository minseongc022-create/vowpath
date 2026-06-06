"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand/BrandLogo";

import { LogoutButton } from "@/components/auth/LogoutButton";

import {

  IconCalendar,

  IconDashboard,

  IconDiamond,

  IconMissedCalls,

  IconRequests,

  IconSettings,

} from "@/components/dashboard/DashboardNavIcons";

import { ROUTES } from "@/lib/constants";

import { vowDashboard } from "@/lib/content";



const v = vowDashboard.nav;



type NavItem = {

  href: string;

  label: string;

  match: (path: string) => boolean;

  badge?: number;

  icon: React.ReactNode;

};



type DashboardShellProps = {

  shopName: string;

  pendingReviewCount?: number;

  children: React.ReactNode;

};



function shopInitials(name: string): string {

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {

    return (parts[0][0] + parts[1][0]).toUpperCase();

  }

  const s = name.trim();

  return s.length >= 2 ? s.slice(0, 2).toUpperCase() : s.slice(0, 1).toUpperCase() || "?";

}



export function DashboardShell({

  shopName,

  pendingReviewCount = 0,

  children,

}: DashboardShellProps) {

  const pathname = usePathname();



  const nav: NavItem[] = [

    {

      href: ROUTES.dashboard,

      label: v.dashboard,

      match: (p) => p === ROUTES.dashboard,

      icon: <IconDashboard />,

    },

    {

      href: `${ROUTES.dashboard}/bookings`,

      label: v.requests,

      match: (p) => p.startsWith(`${ROUTES.dashboard}/bookings`),

      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,

      icon: <IconRequests />,

    },

    {

      href: ROUTES.calendar,

      label: v.calendar,

      match: (p) => p.startsWith(ROUTES.calendar),

      icon: <IconCalendar />,

    },

    {

      href: ROUTES.missedCallsAnalytics,

      label: v.missedCalls,

      match: (p) => p.startsWith(ROUTES.missedCallsAnalytics),

      icon: <IconMissedCalls />,

    },

    {

      href: ROUTES.settings,

      label: v.settings,

      match: (p) => p.startsWith(ROUTES.settings),

      icon: <IconSettings />,

    },

  ];



  return (

    <div className="vow-dash flex min-h-screen items-start">

      <aside className="vow-dash-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:shrink-0 lg:overflow-y-auto">

        <div className="flex h-full w-full flex-col px-4 py-5">

          <BrandLogo

            variant="light"

            size="sm"

            href={ROUTES.dashboard}

            className="px-1"

          />



          <nav className="mt-8 flex flex-col gap-0.5" aria-label="대시보드 메뉴">

            {nav.map((item) => {

              const active = item.match(pathname);

              return (

                <Link

                  key={item.href}

                  href={item.href}

                  prefetch

                  className={`vow-dash-nav-item ${active ? "vow-dash-nav-item-active" : ""}`}

                >

                  <span

                    className={`vow-dash-nav-icon ${

                      active

                        ? "bg-violet-500/20 text-violet-200"

                        : "bg-white/[0.04] text-slate-500"

                    }`}

                  >

                    {item.icon}

                  </span>

                  <span className="flex-1">{item.label}</span>

                  {item.badge ? (

                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">

                      {item.badge}

                    </span>

                  ) : null}

                </Link>

              );

            })}

          </nav>



          <div className="vow-dash-card mt-auto !rounded-2xl !border-violet-500/25 !bg-[#161b22]">

            <div className="flex items-center gap-2 text-violet-300">

              <IconDiamond className="h-4 w-4" />

              <p className="text-sm font-semibold text-white">{vowDashboard.upgrade.title}</p>

            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">

              {vowDashboard.upgrade.body}

            </p>

            <Link

              href={`${ROUTES.home}#pricing`}

              className="vow-dash-btn-primary mt-3 w-full text-center text-sm"

            >

              {vowDashboard.upgrade.cta}

            </Link>

          </div>



          <div className="mt-4 flex items-center gap-3 border-t border-white/[0.06] pt-4">

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-bold text-slate-200">

              {shopInitials(shopName)}

            </span>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-semibold text-white">{shopName}</p>

              <p className="truncate text-xs text-slate-500">HVAC · Vowpath</p>

            </div>

            <LogoutButton className="!text-xs !text-slate-500 hover:!text-white" />

          </div>

        </div>

      </aside>



      <div className="vow-dash-main flex min-h-screen min-w-0 flex-1 flex-col">

        <div className="border-b border-white/[0.06] bg-[#12161f] px-4 py-3 lg:hidden">

          <div className="flex items-center justify-between gap-3">

            <BrandLogo variant="light" size="sm" href={ROUTES.dashboard} />

            <div className="flex gap-2 overflow-x-auto">

              {nav.map((item) => (

                <Link

                  key={item.href}

                  href={item.href}

                  prefetch

                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${

                    item.match(pathname)

                      ? "bg-violet-500/20 text-violet-200"

                      : "text-slate-400"

                  }`}

                >

                  {item.label}

                  {item.badge ? ` (${item.badge})` : ""}

                </Link>

              ))}

            </div>

          </div>

        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>

      </div>

    </div>

  );

}

