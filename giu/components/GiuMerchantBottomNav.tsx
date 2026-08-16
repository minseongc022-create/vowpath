"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { GiuFloatingBottomNav } from "@/giu/components/GiuFloatingBottomNav";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES, isGiuMerchantPath } from "@/giu/lib/routes";
import { useGiuLocale } from "./GiuLocaleProvider";

export function GiuMerchantBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useGiuLocale();
  const tabParam = searchParams.get("tab");

  if (!isGiuMerchantPath(pathname)) return null;

  const tabs = [
    {
      href: GIU_ROUTES.merchant.panel,
      label: t(locale, "mTabBoxes"),
      icon: "box" as const,
      match: (_path: string, _search: string) =>
        tabParam !== "orders" && tabParam !== "settings",
    },
    {
      href: `${GIU_ROUTES.merchant.panel}?tab=orders`,
      label: t(locale, "mTabOrders"),
      icon: "ticket" as const,
      match: (_path: string, _search: string) => tabParam === "orders",
    },
    {
      href: `${GIU_ROUTES.merchant.panel}?tab=settings`,
      label: t(locale, "mTabSettings"),
      icon: "settings" as const,
      match: (_path: string, _search: string) => tabParam === "settings",
    },
  ];

  return <GiuFloatingBottomNav tabs={tabs} getSearch={() => tabParam ?? ""} />;
}
