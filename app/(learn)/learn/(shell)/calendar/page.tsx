import { CalendarClient } from "@/learn/components/study/CalendarClient";

export default function CalendarPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-24 learn-animate-in">
      <h1 className="mb-6 text-2xl font-bold text-learn-ink">학습 캘린더</h1>
      <CalendarClient />
    </main>
  );
}
