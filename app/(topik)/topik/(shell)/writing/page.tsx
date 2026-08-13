import nextDynamic from "next/dynamic";
import { vi } from "@/topik/lib/i18n/vi";

const WritingCorrectionForm = nextDynamic(
  () =>
    import("@/topik/components/writing/WritingCorrectionForm").then(
      (m) => m.WritingCorrectionForm,
    ),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="topik-skeleton h-24" />
        <div className="topik-skeleton h-40" />
      </div>
    ),
  },
);

export const dynamic = "force-static";

export default function WritingPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-xl font-extrabold">{vi.writing.title}</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--topik-ink-muted)]">{vi.writing.subtitle}</p>
      <WritingCorrectionForm />
    </main>
  );
}
