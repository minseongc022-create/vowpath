"use client";

import { usePathname } from "next/navigation";
import { GiuFloatingBottomNav } from "@/giu/components/GiuFloatingBottomNav";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "./GiuLocaleProvider";
import { toGiuInternalPath } from "@/giu/lib/routes";

type Props = {
  docked?: boolean;
};

export function GiuCustomerBottomNav({ docked = false }: Props) {
  const pathname = usePathname();
  const { locale } = useGiuLocale();
  const internal = toGiuInternalPath(pathname);

  const tabs = [
    {
      href: GIU_ROUTES.customer.boxes,
      label: t(locale, "boxes"),
      icon: "box" as const,
      match: (path: string) => {
        const i = toGiuInternalPath(path);
        return i === GIU_ROUTES.customer.boxes || i.startsWith(`${GIU_ROUTES.customer.boxes}/`);
      },
    },
    {
      href: GIU_ROUTES.customer.favorites,
      label: t(locale, "favorites"),
      icon: "heart" as const,
      match: (path: string) => {
        const i = toGiuInternalPath(path);
        return i === GIU_ROUTES.customer.favorites || i.startsWith(`${GIU_ROUTES.customer.favorites}/`);
      },
    },
    {
      href: GIU_ROUTES.customer.my,
      label: t(locale, "myCodes"),
      icon: "ticket" as const,
      match: (path: string) => {
        const i = toGiuInternalPath(path);
        return i === GIU_ROUTES.customer.my || i.startsWith(`${GIU_ROUTES.customer.my}/`);
      },
    },
  ];

  return <GiuFloatingBottomNav tabs={tabs} docked={docked} getSearch={() => internal} />;
}
