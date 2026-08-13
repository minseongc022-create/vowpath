"use client";

import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TOPIK_BRAND } from "@/topik/lib/brand";
import { useTopikStore } from "@/topik/components/providers/TopikStoreProvider";

export function TopikHomeClient() {
  const { ready, progress, srsStats } = useTopikStore();

  if (!ready) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6 pb-8">
        <div className="topik-skeleton h-32 mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="topik-skeleton h-20" />
          <div className="topik-skeleton h-20" />
        </div>
        <div className="space-y-3">
          <div className="topik-skeleton h-16" />
          <div className="topik-skeleton h-16" />
          <div className="topik-skeleton h-16" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-8 topik-animate-in">
      <section className="topik-gradient-header -mx-4 px-4 pt-6 pb-8 rounded-b-[28px] text-white mb-6">
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
          {vi.home.heroBadge}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight">{vi.home.greeting}</h1>
        <p className="mt-1.5 text-sm text-white/85 leading-relaxed">{vi.home.subtitle}</p>
        <p className="mt-2 text-[11px] text-white/60">{TOPIK_BRAND.name}</p>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 -mt-2">
        <div className="topik-card-elevated p-4">
          <p className="text-[10px] font-bold uppercase text-[var(--topik-ink-muted)]">{vi.home.targetLevel}</p>
          <p className="topik-stat-value mt-1 text-[var(--topik-primary)]">TOPIK {progress.targetLevel}</p>
        </div>
        <div className="topik-card-elevated p-4">
          <p className="text-[10px] font-bold uppercase text-[var(--topik-ink-muted)]">{vi.home.streak}</p>
          <p className="topik-stat-value mt-1 text-[var(--topik-accent)]">
            {progress.streak}
            <span className="ml-1 text-sm font-semibold text-[var(--topik-ink-muted)]">{vi.home.days}</span>
          </p>
        </div>
      </section>

      {srsStats.due > 0 && (
        <Link
          href="/topik/review"
          prefetch
          className="mb-5 flex items-center justify-between rounded-[var(--topik-radius-lg)] bg-[var(--topik-primary)] p-4 text-white shadow-[var(--topik-shadow-md)] active:scale-[0.99] transition-transform"
        >
          <div>
            <p className="text-sm font-bold">{vi.home.startReview}</p>
            <p className="text-xs opacity-90">{srsStats.due} {vi.home.cardsDue}</p>
          </div>
          <span className="text-xl font-bold">→</span>
        </Link>
      )}

      <section>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--topik-ink-muted)]">
          {vi.home.quickActions}
        </p>
        <div className="space-y-2.5">
          {[
            { href: "/topik/writing", icon: "✍️", title: vi.home.writingTitle, desc: vi.home.writingDesc, bg: "var(--topik-primary-soft)" },
            { href: "/topik/practice", icon: "📝", title: vi.home.practiceTitle, desc: vi.home.practiceDesc, bg: "var(--topik-accent-soft)" },
            { href: "/topik/lessons", icon: "📚", title: vi.home.lessonsTitle, desc: vi.home.lessonsDesc, bg: "#fff4e6" },
            { href: "/topik/review", icon: "🔄", title: vi.home.reviewTitle, desc: `${vi.home.reviewDesc} · ${srsStats.total} thẻ`, bg: "#ecfdf5" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="topik-card flex items-center gap-4 p-4 active:scale-[0.99] transition-transform"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
                style={{ background: item.bg }}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--topik-ink)]">{item.title}</p>
                <p className="text-xs text-[var(--topik-ink-muted)] leading-snug">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
