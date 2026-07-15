"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";

const OPTIONS = [
  { href: "/", labelEn: "Restoration", labelEs: "Restauración" },
  { href: "/hvac", labelEn: "HVAC", labelEs: "HVAC" },
] as const;

/** Lets a visitor jump to the landing page built for their trade — each page has its
 *  own demo and feature callouts instead of trying to cover every vertical in one page. */
export function VerticalSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const active = pathname === "/hvac" ? "/hvac" : "/";
  const isEs = locale === "es";
  const banner = isEs ? "Mira el sitio para tu oficio" : "See the site built for your trade";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-xs font-medium text-stone-600 md:text-sm">{banner}</p>
      <div
        className="inline-flex items-stretch gap-1 rounded-full border border-brand-300 bg-white p-1 shadow-sm"
        role="group"
        aria-label={isEs ? "Elige tu oficio" : "Choose your trade"}
      >
        {OPTIONS.map((opt) => {
          const label = isEs ? opt.labelEs : opt.labelEn;
          return (
            <Link
              key={opt.href}
              href={opt.href}
              className={`grid h-11 min-w-[7.5rem] place-items-center rounded-full px-5 text-sm font-semibold transition ${
                active === opt.href
                  ? "bg-brand-900 text-white shadow-sm"
                  : "text-brand-700 hover:bg-brand-100"
              }`}
            >
              <span className="block translate-y-px leading-[1.125]">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
