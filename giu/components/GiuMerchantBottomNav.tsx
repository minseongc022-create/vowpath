"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { GiuNavIcon } from "@/giu/components/icons/GiuNavIcons";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES, isGiuMerchantPath } from "@/giu/lib/routes";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

export function GiuMerchantBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "orders" ? "orders" : tabParam === "settings" ? "settings" : "boxes";

  if (!isGiuMerchantPath(pathname)) return null;

  const tabs = [
    {
      path: GIU_ROUTES.merchant.panel,
      tab: "boxes",
      label: t(locale, "mTabBoxes"),
      icon: "box" as const,
    },
    {
      path: `${GIU_ROUTES.merchant.panel}?tab=orders`,
      tab: "orders",
      label: t(locale, "mTabOrders"),
      icon: "ticket" as const,
    },
    {
      path: `${GIU_ROUTES.merchant.panel}?tab=settings`,
      tab: "settings",
      label: t(locale, "mTabSettings"),
      icon: "settings" as const,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-giu-border/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-giu-nav backdrop-blur-xl">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-6 md:max-w-xl lg:max-w-2xl">
        {tabs.map((tab) => {
          const active = activeTab === tab.tab;
          return (
            <Link
              key={tab.tab}
              href={href(tab.path)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-tight transition ${
                active ? "text-giu-accent" : "text-giu-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <GiuNavIcon name={tab.icon} active={active} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
