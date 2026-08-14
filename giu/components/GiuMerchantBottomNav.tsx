"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { GiuNavIcon } from "@/giu/components/icons/GiuNavIcons";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { GIU_STRINGS } from "@/giu/lib/strings";

const TABS = [
  { href: GIU_ROUTES.merchant.panel, tab: "boxes", label: "박스", icon: "box" as const },
  { href: `${GIU_ROUTES.merchant.panel}?tab=orders`, tab: "orders", label: "주문", icon: "ticket" as const },
];

export function GiuMerchantBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "orders" ? "orders" : "boxes";

  if (!pathname.startsWith(GIU_ROUTES.merchant.panel)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-giu-border bg-giu-surface/95 pb-[env(safe-area-inset-bottom)] shadow-giu-nav backdrop-blur-md">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-6 md:max-w-xl lg:max-w-2xl">
        {TABS.map((tab) => {
          const active = activeTab === tab.tab;
          return (
            <Link
              key={tab.tab}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
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
