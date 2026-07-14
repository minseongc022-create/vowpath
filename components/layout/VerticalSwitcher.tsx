"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OPTIONS = [
  { href: "/", label: "Restoration" },
  { href: "/hvac", label: "HVAC" },
] as const;

/** Lets a visitor jump to the landing page built for their trade — each page has its
 *  own demo and feature callouts instead of trying to cover every vertical in one page. */
export function VerticalSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const active = pathname === "/hvac" ? "/hvac" : "/";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-brand-300 bg-white p-1 shadow-sm ${className}`}
      role="group"
      aria-label="Choose your trade"
    >
      {OPTIONS.map((opt) => (
        <Link
          key={opt.href}
          href={opt.href}
          className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition ${
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
