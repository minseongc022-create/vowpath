"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SITE } from "@/lib/site";

const nav = [
  { href: "/dashboard", label: "이번 달 마감" },
  { href: "/dashboard/clients", label: "수임처" },
  { href: "/dashboard/templates", label: "요청 문구" },
  { href: "/dashboard/import", label: "가져오기" },
  { href: "/dashboard/outreach", label: "연락 목록" },
  { href: "/dashboard/settings", label: "설정" },
];

export function DashboardShell({
  children,
  officeName,
}: {
  children: React.ReactNode;
  officeName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-mesh-hero pb-10">
      <header className="border-b border-paper-line/80 bg-paper-card/90 backdrop-blur">
        <div className="sc-container flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="font-display text-lg font-medium text-ink">
              {SITE.name}
            </Link>
            <span className="hidden truncate rounded-full border border-paper-line bg-white px-2.5 py-0.5 text-xs text-ink-muted sm:inline">
              {officeName || "데모 사무소"}
            </span>
          </div>
          <button
            type="button"
            className="sc-btn-ghost min-h-10 shrink-0 text-sm"
            onClick={() => {
              window.localStorage.removeItem("suimcheck.session");
              router.push("/");
            }}
          >
            나가기
          </button>
        </div>
        <div className="sc-container flex gap-1.5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                  active ? "bg-ink text-paper" : "text-ink-muted hover:bg-white hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="sc-container py-6 sm:py-8">{children}</main>
    </div>
  );
}
