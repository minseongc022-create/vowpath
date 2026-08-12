import { WrongNotesClient } from "@/learn/components/study/WrongNotesClient";

export default function WrongNotesPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-24 learn-animate-in">
      <h1 className="mb-6 text-2xl font-bold text-learn-ink">오답노트</h1>
      <WrongNotesClient />
    </main>
  );
}
