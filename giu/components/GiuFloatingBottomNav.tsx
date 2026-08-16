"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiuNavIcon, type GiuNavIconName } from "@/giu/components/icons/GiuNavIcons";
import { hapticSelect } from "@/giu/lib/haptics";
import { useGiuHref } from "./GiuNavProvider";

export type GiuFloatingNavTab = {
  href: string;
  label: string;
  icon: GiuNavIconName;
  match: (pathname: string, search: string) => boolean;
};

type Props = {
  tabs: GiuFloatingNavTab[];
  /** When true, nav sits in document flow (map home). */
  docked?: boolean;
  getSearch?: () => string;
};

export function GiuFloatingBottomNav({ tabs, docked = false, getSearch }: Props) {
  const pathname = usePathname();
  const href = useGiuHref();
  const search = typeof window !== "undefined" && getSearch ? getSearch() : "";

  const activeIndex = tabs.findIndex((tab) => tab.match(pathname, search));

  return (
    <div
      className={
        docked
          ? "relative z-50 shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
          : "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      }
    >
      <nav
        className="giu-floating-nav pointer-events-auto mx-auto max-w-[480px] md:max-w-xl lg:max-w-2xl"
        aria-label="Main"
      >
        <div className="relative flex items-stretch justify-around px-1 py-1.5">
          {activeIndex >= 0 ? (
            <span
              className="giu-floating-nav-pill"
              style={{
                width: `${100 / tabs.length}%`,
                transform: `translateX(${activeIndex * 100}%)`,
              }}
              aria-hidden
            />
          ) : null}
          {tabs.map((tab) => {
            const active = tab.match(pathname, search);
            return (
              <Link
                key={tab.href}
                href={href(tab.href)}
                onClick={() => hapticSelect()}
                className={`giu-floating-nav-item ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <GiuNavIcon name={tab.icon} active={active} />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
