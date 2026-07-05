"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OPTIONS = [
  { href: "/", label: "복구업체" },
  { href: "/hvac", label: "HVAC" },
] as const;

/** Lets a visitor jump to the landing page built for their trade — each page has its
 *  own demo and feature callouts instead of trying to cover every vertical in one page. */
export function VerticalSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const active = pathname === "/hvac" ? "/hvac" : "/";

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-brand-200 bg-brand-50 p-0.5 ${className}`}
      role="group"
      aria-label="업종 선택"
    >
      {OPTIONS.map((opt) => (
        <Link
          key={opt.href}
          href={opt.href}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            active === opt.href
              ? "bg-brand-900 text-white shadow-sm"
              : "text-brand-700 hover:bg-brand-100"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
