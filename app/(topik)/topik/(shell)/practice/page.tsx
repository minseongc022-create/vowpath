import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikQuizClient } from "@/topik/components/quiz/TopikQuizClient";

export default function PracticePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 learn-animate-in">
      <h1 className="text-xl font-black text-learn-ink">{vi.practice.title}</h1>
      <p className="mt-1 mb-4 text-sm text-learn-ink-muted">{vi.practice.subtitle}</p>
      <Link
        href="/topik/mock-exam"
        className="mb-6 block rounded-2xl bg-learn-accent/10 border border-learn-accent/20 p-4 active:scale-[0.99] transition-transform"
      >
        <p className="text-sm font-bold text-learn-accent">{vi.home.mockExamTitle}</p>
        <p className="text-xs text-learn-ink-muted mt-0.5">{vi.home.mockExamDesc}</p>
      </Link>
      <TopikQuizClient />
    </main>
  );
}
