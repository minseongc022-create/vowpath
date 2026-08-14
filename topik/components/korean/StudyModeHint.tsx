"use client";

import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";

/** Study-mode banner — hidden during exams */
export function StudyModeHint() {
  const vi = useTopikVi();

  return (
    <p className="topik-study-hint" role="note">
      💡 {vi.korean.tapHint}
    </p>
  );
}
