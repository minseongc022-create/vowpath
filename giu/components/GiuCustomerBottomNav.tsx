"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiuNavIcon } from "@/giu/components/icons/GiuNavIcons";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { GIU_STRINGS } from "@/giu/lib/strings";

const TABS = [
  { href: GIU_ROUTES.customer.boxes, label: GIU_STRINGS.navBoxes, icon: "box" as const },
  { href: GIU_ROUTES.customer.favorites, label: GIU_STRINGS.navFavorites, icon: "heart" as const },
  { href: GIU_ROUTES.customer.my, label: GIU_STRINGS.navMy, icon: "ticket" as const },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GiuCustomerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-giu-border/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-giu-nav backdrop-blur-xl">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-3 md:max-w-xl lg:max-w-2xl">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-tight transition ${
                active ? "text-giu-primary" : "text-giu-muted"
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
