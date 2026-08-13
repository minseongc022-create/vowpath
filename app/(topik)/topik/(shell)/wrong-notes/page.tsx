import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { listWrongAnswers, resolveTopikUserId } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import { WrongNotesClient } from "@/topik/components/wrong-notes/WrongNotesClient";

export default async function WrongNotesPage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const wrongs = await listWrongAnswers(userId);

  return (
    <main className="topik-page">
      <div className="mb-4 flex items-start justify-between gap-3">
        <TopikPageHeader title={vi.wrongNotes.title} className="!mb-0" />
        <Link href="/topik" className="shrink-0 text-xs font-semibold text-learn-primary pt-1">
          {vi.common.back}
        </Link>
      </div>
      <WrongNotesClient initial={wrongs} />
    </main>
  );
}
