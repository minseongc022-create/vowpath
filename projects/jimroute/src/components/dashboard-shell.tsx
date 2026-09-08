"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

const NAV = [
  { href: "/dashboard", label: "홈" },
  { href: "/dashboard/quotes/new", label: "견적" },
  { href: "/dashboard/jobs", label: "작업" },
  { href: "/dashboard/dispatch", label: "배차" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white">
              짐
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">짐루트</p>
              <p className="text-xs text-slate-500">이사 견적·배차·고객안내</p>
            </div>
          </Link>
          <Link
            href="/dashboard/quotes/new"
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            + 새 견적
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <nav className="hidden space-y-1 lg:block">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main>{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-slate-200 bg-white p-2 lg:hidden">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg py-2 text-center text-xs font-medium ${
                active ? "text-orange-600" : "text-slate-500"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
