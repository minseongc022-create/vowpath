import Link from "next/link";
import { QuickStartForm } from "@/learn/components/study/QuickStartForm";
import { getLearnSession } from "@/learn/lib/auth";
import { listMaterials, resolveUserId } from "@/learn/lib/library/repository";

export default async function LearnHomePage() {
  const session = await getLearnSession();
  const userId = resolveUserId(session?.user?.id);
  const recent = (await listMaterials(userId)).slice(0, 3);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-28 learn-animate-in">
      <section className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold text-learn-primary">EFFIROAD Learn</p>
        <h1 className="text-2xl font-bold leading-tight text-learn-ink">
          영상 넣고
          <br />
          바로 학습 시작
        </h1>
        <p className="mt-2 text-sm text-learn-ink-muted">
          AI 요약 · 마인드맵 · 퀴즈 · 오답노트까지 한 번에
        </p>
      </section>

      <QuickStartForm />

      <section className="mt-8 grid grid-cols-2 gap-3">
        <Link
          href="/learn/calendar"
          className="flex flex-col items-center rounded-2xl border border-learn-border bg-learn-surface p-4 shadow-learn-sm active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl">📅</span>
          <span className="mt-2 text-sm font-bold text-learn-ink">오늘 학습</span>
          <span className="text-[11px] text-learn-ink-muted">캘린더</span>
        </Link>
        <Link
          href="/learn/wrong-notes"
          className="flex flex-col items-center rounded-2xl border border-learn-border bg-learn-surface p-4 shadow-learn-sm active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl">📝</span>
          <span className="mt-2 text-sm font-bold text-learn-ink">오답노트</span>
          <span className="text-[11px] text-learn-ink-muted">틀린 문제 복습</span>
        </Link>
      </section>

      {recent.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-learn-ink">최근 학습</h2>
            <Link href="/learn/library" className="text-xs font-medium text-learn-primary">
              전체 →
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((m) => (
              <Link
                key={m.id}
                href={`/learn/study/${m.id}`}
                className="flex items-center gap-3 rounded-2xl border border-learn-border bg-learn-surface px-4 py-3 active:scale-[0.99] transition-transform"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-learn-primary/10 text-lg">
                  {m.type === "YOUTUBE" ? "▶️" : "📄"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-learn-ink">{m.title}</p>
                  <p className="text-[11px] text-learn-ink-muted">
                    {m.status === "READY" ? "학습 가능" : "분석 중…"}
                  </p>
                </div>
                <span className="text-learn-primary text-sm">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
