import { headers } from "next/headers";
import Link from "next/link";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";

const NAV = [
  { href: "/pricepulse/rank", label: "순위 추적" },
  { href: "/pricepulse/trending", label: "급상승" },
  { href: "/pricepulse/keywords", label: "키워드 관리" },
];

/**
 * Pure presentation — the auth gate lives in middleware.ts, which redirects
 * unauthenticated requests to /pricepulse/login before they ever reach here.
 */
async function PricepulseNav() {
  const [h, seller] = await Promise.all([headers(), getCurrentSeller()]);
  const pathname = h.get("x-pathname") ?? "";

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/pricepulse" className="text-sm font-bold text-slate-900">
            Pricepulse
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {seller?.email ? <span className="hidden sm:inline">{seller.email}</span> : null}
          <Link href="/pricepulse/logout" className="hover:text-slate-600">
            로그아웃
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function PricepulseAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PricepulseNav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
