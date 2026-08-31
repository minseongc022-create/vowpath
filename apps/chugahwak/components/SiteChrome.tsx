"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SITE } from "@/lib/site";

const nav = [
  { href: "/dashboard", label: "오늘 합의" },
  { href: "/dashboard/projects", label: "현장" },
  { href: "/dashboard/new", label: "변경 만들기" },
  { href: "/dashboard/settings", label: "설정" },
];

export function DashboardShell({
  children,
  companyName,
}: {
  children: React.ReactNode;
  companyName?: string;
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
              {companyName || "데모"}
            </span>
          </div>
          <button
            type="button"
            className="sc-btn-ghost min-h-10 shrink-0 text-sm"
            onClick={() => {
              localStorage.removeItem("chugahwak.session");
              router.push("/");
            }}
          >
            나가기
          </button>
        </div>
        <div className="sc-container flex gap-1.5 overflow-x-auto pb-3">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm font-medium ${
                  active ? "bg-ink text-white" : "text-ink-muted hover:bg-white hover:text-ink"
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

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-soft">
      {message}
    </div>
  );
}

export function SiteHeader({ solid }: { solid?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-paper-line/70 ${
        solid ? "bg-paper-card" : "bg-paper-card/80 backdrop-blur"
      }`}
    >
      <div className="sc-container flex h-14 items-center justify-between">
        <Link href="/" className="font-display text-xl font-medium text-ink">
          {SITE.name}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/pricing" className="sc-btn-ghost hidden sm:inline-flex">
            요금
          </Link>
          <Link href="/login" className="sc-btn-ghost">
            로그인
          </Link>
          <Link href="/signup" className="sc-btn-primary px-4">
            데모 시작
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-paper-line py-10 text-sm text-ink-muted">
      <div className="sc-container flex flex-col gap-2 sm:flex-row sm:justify-between">
        <p>
          {SITE.name} · {SITE.nameEn}
        </p>
        <p>{SITE.supportEmail}</p>
      </div>
    </footer>
  );
}
