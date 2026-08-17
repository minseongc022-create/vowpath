"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { GiuNavIcon, type GiuNavIconName } from "@/giu/components/icons/GiuNavIcons";
import { hapticSelect } from "@/giu/lib/haptics";
import { useGiuCustomerNavOptional } from "./GiuCustomerNavProvider";
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
  const customerNav = useGiuCustomerNavOptional();
  const [mounted, setMounted] = useState(false);
  const search = typeof window !== "undefined" && getSearch ? getSearch() : "";

  useEffect(() => setMounted(true), []);

  const activeIndex = tabs.findIndex((tab) => tab.match(pathname, search));

  const nav = (
    <div
      className={
        docked
          ? "relative z-50 shrink-0 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
          : "pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
      }
    >
      <nav
        className="giu-floating-nav pointer-events-auto mx-auto max-w-[480px] md:max-w-xl lg:max-w-2xl"
        aria-label="Main"
      >
        <div className="relative flex items-stretch justify-around px-0.5 py-0.5">
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
                onClick={() => {
                  hapticSelect();
                  if (customerNav && activeIndex >= 0) {
                    const toIndex = tabs.indexOf(tab);
                    if (toIndex > activeIndex) customerNav.setNavDirection("forward");
                    else if (toIndex < activeIndex) customerNav.setNavDirection("back");
                  }
                }}
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

  if (docked) return nav;
  if (!mounted) return null;
  return createPortal(nav, document.body);
}
