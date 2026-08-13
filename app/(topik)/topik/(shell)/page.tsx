import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TOPIK_BRAND } from "@/topik/lib/brand";
import { getSrsStats, getProgress } from "@/topik/lib/store/file-store";
import { resolveTopikUserId } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";

export default async function TopikHomePage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [stats, progress] = await Promise.all([
    getSrsStats(userId),
    getProgress(userId),
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-8 learn-animate-in">
      <section className="mb-6">
        <p className="text-sm font-semibold text-learn-primary">{TOPIK_BRAND.name}</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-learn-ink">
          {vi.home.greeting}
        </h1>
        <p className="mt-2 text-sm text-learn-ink-muted leading-relaxed">
          {vi.home.subtitle}
        </p>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="topik-card p-4">
          <p className="text-[10px] font-bold uppercase text-learn-ink-muted">{vi.home.targetLevel}</p>
          <p className="text-2xl font-black text-learn-primary">TOPIK {progress.targetLevel}</p>
        </div>
        <div className="topik-card p-4">
          <p className="text-[10px] font-bold uppercase text-learn-ink-muted">{vi.home.streak}</p>
          <p className="text-2xl font-black text-learn-accent">
            {progress.streak} <span className="text-sm font-medium text-learn-ink-muted">{vi.home.days}</span>
          </p>
        </div>
      </section>

      {stats.due > 0 && (
        <Link
          href="/topik/review"
          className="mb-6 flex items-center justify-between rounded-2xl bg-learn-primary p-4 text-white shadow-learn-md active:scale-[0.99] transition-transform"
        >
          <div>
            <p className="text-sm font-bold">{vi.home.startReview}</p>
            <p className="text-xs opacity-90">{stats.due} {vi.home.cardsDue}</p>
          </div>
          <span className="text-2xl">→</span>
        </Link>
      )}

      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-learn-ink-muted">
          {vi.home.quickActions}
        </p>
        <div className="space-y-3">
          <Link
            href="/topik/writing"
            className="topik-card flex items-center gap-4 p-4 active:scale-[0.99] transition-transform"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-learn-primary/10 text-2xl">✍️</span>
            <div>
              <p className="text-sm font-bold text-learn-ink">{vi.home.writingTitle}</p>
              <p className="text-xs text-learn-ink-muted">{vi.home.writingDesc}</p>
            </div>
          </Link>
          <Link
            href="/topik/practice"
            className="topik-card flex items-center gap-4 p-4 active:scale-[0.99] transition-transform"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-learn-accent/10 text-2xl">📝</span>
            <div>
              <p className="text-sm font-bold text-learn-ink">{vi.home.practiceTitle}</p>
              <p className="text-xs text-learn-ink-muted">{vi.home.practiceDesc}</p>
            </div>
          </Link>
          <Link
            href="/topik/lessons"
            className="topik-card flex items-center gap-4 p-4 active:scale-[0.99] transition-transform"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-2xl">📚</span>
            <div>
              <p className="text-sm font-bold text-learn-ink">{vi.home.lessonsTitle}</p>
              <p className="text-xs text-learn-ink-muted">{vi.home.lessonsDesc}</p>
            </div>
          </Link>
          <Link
            href="/topik/review"
            className="topik-card flex items-center gap-4 p-4 active:scale-[0.99] transition-transform"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-2xl">🔄</span>
            <div>
              <p className="text-sm font-bold text-learn-ink">{vi.home.reviewTitle}</p>
              <p className="text-xs text-learn-ink-muted">
                {vi.home.reviewDesc} · {stats.total} thẻ · {stats.mastered} thuộc
              </p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
