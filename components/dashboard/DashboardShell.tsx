"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand/BrandLogo";

import { LogoutButton } from "@/components/auth/LogoutButton";

import {

  IconAgreements,

  IconCalendar,

  IconDashboard,

  IconDiamond,

  IconMissedCalls,

  IconRequests,

  IconSettings,

  IconEffiroadAi,

} from "@/components/dashboard/DashboardNavIcons";

import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import { ROUTES } from "@/lib/constants";
import { useVowDashboard } from "@/components/providers/LocaleProvider";



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

  renewingAgreementsCount?: number;

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

  renewingAgreementsCount = 0,

  children,

}: DashboardShellProps) {

  const pathname = usePathname();
  const vowDashboard = useVowDashboard();
  const v = vowDashboard.nav;



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

      href: ROUTES.agreements,

      label: v.agreements,

      match: (p) => p.startsWith(ROUTES.agreements),

      badge: renewingAgreementsCount > 0 ? renewingAgreementsCount : undefined,

      icon: <IconAgreements />,

    },

    {

      href: ROUTES.ai,

      label: v.ai,

      match: (p) => p.startsWith(ROUTES.ai),

      icon: <IconEffiroadAi />,

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



          <nav className="mt-8 flex flex-col gap-0.5" aria-label="Dashboard menu">

            {nav.map((item) => {

              const active = item.match(pathname);

              return (

                <Link

                  key={item.href}

                  href={item.href}

                  prefetch

                  className={`vow-dash-nav-item ${active ? "vow-dash-nav-item-active" : ""} ${
                    item.href === ROUTES.ai ? "vow-dash-nav-item-ai" : ""
                  }`}

                >

                  <span

                    className={`vow-dash-nav-icon ${

                      active

                        ? "bg-brand-500/20 text-brand-200"

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



          <div className="vow-dash-card mt-auto !rounded-2xl !border-brand-500/25 !bg-[#3d3228]">

            <div className="flex items-center gap-2 text-brand-300">

              <IconDiamond className="h-4 w-4" />

              <p className="text-sm font-semibold text-white">{vowDashboard.upgrade.title}</p>

            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">

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

              <p className="truncate text-xs text-slate-500">HVAC · Effiroad</p>

            </div>

            <LogoutButton className="!text-xs !text-slate-500 hover:!text-white" />

          </div>

        </div>

      </aside>



      <div className="vow-dash-main flex min-h-screen min-w-0 flex-1 flex-col">

        <header className="border-b border-brand-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <BrandLogo variant="dark" size="sm" href={ROUTES.dashboard} />
        </header>

        <main className="vow-dash-main-scroll flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>

        <DashboardMobileNav pendingReviewCount={pendingReviewCount} />
      </div>

    </div>

  );

}

