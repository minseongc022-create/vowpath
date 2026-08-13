import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { TopikQuizClient } from "@/topik/components/quiz/TopikQuizClient";

export default function PracticePage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.practice.title} subtitle={vi.practice.subtitle} />
      <Link
        href="/topik/mock-exam"
        className="topik-card topik-card-interactive mb-5 flex items-center gap-4 p-4 bg-[var(--topik-blue-soft)]"
      >
        <span className="topik-icon-box bg-white text-xl">🖥️</span>
        <div>
          <p className="text-sm font-semibold text-learn-ink">{vi.home.mockExamTitle}</p>
          <p className="text-xs text-learn-ink-muted mt-0.5">{vi.home.mockExamDesc}</p>
        </div>
      </Link>
      <TopikQuizClient />
    </main>
  );
}
