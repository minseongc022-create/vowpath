"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiuNavIcon } from "@/giu/components/icons/GiuNavIcons";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "./GiuLocaleProvider";

type Props = {
  /** In-flow under map (no fixed overlay) so the viewport never clips the tab bar */
  docked?: boolean;
};

export function GiuCustomerBottomNav({ docked = false }: Props) {
  const pathname = usePathname();
  const { locale } = useGiuLocale();

  const tabs = [
    { href: GIU_ROUTES.customer.boxes, label: t(locale, "boxes"), icon: "box" as const },
    { href: GIU_ROUTES.customer.favorites, label: t(locale, "favorites"), icon: "heart" as const },
    { href: GIU_ROUTES.customer.my, label: t(locale, "myCodes"), icon: "ticket" as const },
  ];

  return (
    <nav
      className={
        docked
          ? "relative z-50 shrink-0 border-t border-giu-border/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-giu-nav backdrop-blur-xl"
          : "fixed inset-x-0 bottom-0 z-50 border-t border-giu-border/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-giu-nav backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-3 md:max-w-xl lg:max-w-2xl">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
