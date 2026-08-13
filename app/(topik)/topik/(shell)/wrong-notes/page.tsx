import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { WrongNotesClient } from "@/topik/components/wrong-notes/WrongNotesClient";

export default function WrongNotesPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 topik-animate-in">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{vi.wrongNotes.title}</h1>
        <Link href="/topik" prefetch className="text-xs font-semibold text-[var(--topik-primary)]">{vi.common.back}</Link>
      </div>
      <WrongNotesClient />
    </main>
  );
}
