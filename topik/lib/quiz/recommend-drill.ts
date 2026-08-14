import type { SessionStats } from "@/topik/lib/quiz/check-answer";
import { ibtSectionLabel } from "@/topik/lib/mock-exam/ibt-exam";
import { l } from "@/topik/lib/i18n/locale-text";

export type DrillRecommendation = {
  section: string;
  label: string;
  href: string;
  reason: string;
  accuracy: number;
};

const SECTION_TO_DRILL: Record<string, { href: string; drillType: string }> = {
  listening: { href: "/topik/drill?type=listening", drillType: "listening" },
  reading: { href: "/topik/drill?type=reading", drillType: "reading" },
  grammar: { href: "/topik/practice?category=grammar", drillType: "grammar" },
  vocabulary: { href: "/topik/practice?category=vocabulary", drillType: "vocabulary" },
  writing: { href: "/topik/writing", drillType: "writing" },
};

/** Pick weak sections and map to drill/practice links */
export function getDrillRecommendations(
  bySection: SessionStats["bySection"],
  threshold = 0.7,
): DrillRecommendation[] {
  const recs: DrillRecommendation[] = [];

  for (const [section, { correct, total }] of Object.entries(bySection)) {
    if (total === 0) continue;
    const accuracy = correct / total;
    if (accuracy >= threshold) continue;

    const mapping = SECTION_TO_DRILL[section];
    const href =
      section === "reading" && accuracy < 0.5
        ? "/topik/drill?type=order"
        : mapping?.href ?? `/topik/practice?category=${section}`;

    recs.push({
      section,
      label: ibtSectionLabel(section),
      href,
      accuracy: Math.round(accuracy * 100),
      reason: l(
        `${Math.round(accuracy * 100)}% đúng — luyện thêm ${ibtSectionLabel(section)}`,
        `${Math.round(accuracy * 100)}% 정답 — ${ibtSectionLabel(section)} 추가 연습`,
      ),
    });
  }

  return recs.sort((a, b) => a.accuracy - b.accuracy);
}

export function getPrimaryDrillHref(recs: DrillRecommendation[]): string | null {
  return recs[0]?.href ?? null;
}
