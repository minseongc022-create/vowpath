import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { listWrongAnswers, resolveTopikUserId } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import { WrongNotesClient } from "@/topik/components/wrong-notes/WrongNotesClient";

export default async function WrongNotesPage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const wrongs = await listWrongAnswers(userId);

  return (
    <main className="mx-auto max-w-lg px-4 py-6 learn-animate-in">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-learn-ink">{vi.wrongNotes.title}</h1>
        <Link href="/topik" className="text-xs font-medium text-learn-primary">{vi.common.back}</Link>
      </div>
      <WrongNotesClient initial={wrongs} />
    </main>
  );
}
