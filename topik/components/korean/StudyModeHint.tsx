import { vi } from "@/topik/lib/i18n/vi";

/** Study-mode banner — hidden during exams */
export function StudyModeHint() {
  return (
    <p className="topik-study-hint" role="note">
      💡 {vi.korean.tapHint}
    </p>
  );
}
