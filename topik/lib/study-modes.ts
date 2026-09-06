/** TOPIK study mode registry */

import type { ViStrings } from "@/topik/lib/i18n/strings";

export type StudyModeId =
  | "speaking"
  | "writing"
  | "typing"
  | "vocab"
  | "practice"
  | "drill"
  | "mock-exam"
  | "lessons"
  | "review"
  | "wrong-notes";

export type StudyMode = {
  id: StudyModeId;
  href: string;
  title: string;
  desc: string;
  tint: "primary" | "coral" | "mint" | "blue" | "gold";
};

export function getStudyModes(vi: ViStrings): StudyMode[] {
  return [
  {
    id: "speaking",
    href: "/topik/speaking",
    title: vi.home.speakingTitle,
    desc: vi.home.speakingDesc,
    tint: "primary",
  },
  {
    id: "writing",
    href: "/topik/writing",
    title: vi.home.writingTitle,
    desc: vi.home.writingDesc,
    tint: "coral",
  },
  {
    id: "typing",
    href: "/topik/typing",
    title: vi.home.typingTitle,
    desc: vi.home.typingDesc,
    tint: "gold",
  },
  {
    id: "mock-exam",
    href: "/topik/mock-exam",
    title: vi.home.mockExamTitle,
    desc: vi.home.mockExamDesc,
    tint: "blue",
  },
  {
    id: "drill",
    href: "/topik/drill",
    title: vi.drill.title,
    desc: vi.drill.pageSubtitle,
    tint: "blue",
  },
  {
    id: "vocab",
    href: "/topik/vocab",
    title: vi.vocab.title,
    desc: vi.vocab.subtitle,
    tint: "mint",
  },
  {
    id: "practice",
    href: "/topik/practice",
    title: vi.home.practiceTitle,
    desc: vi.home.practiceDesc,
    tint: "mint",
  },
  {
    id: "lessons",
    href: "/topik/lessons",
    title: vi.home.lessonsTitle,
    desc: vi.home.lessonsDesc,
    tint: "gold",
  },
  {
    id: "review",
    href: "/topik/review",
    title: vi.home.reviewTitle,
    desc: vi.home.reviewDesc,
    tint: "primary",
  },
  {
    id: "wrong-notes",
    href: "/topik/wrong-notes",
    title: vi.nav.wrongNotes,
    desc: vi.wrongNotes.desc,
    tint: "coral",
  },
  ];
}

export const CORE_STUDY_MODE_IDS: StudyModeId[] = [
  "drill",
  "practice",
  "mock-exam",
  "wrong-notes",
];

/** Shown on home quick grid — core exam prep only */
export const CORE_HOME_MODES: StudyModeId[] = CORE_STUDY_MODE_IDS;

export const HOME_FAVORITE_MODES: StudyModeId[] = CORE_HOME_MODES;

export function getCoreStudyModes(vi: ViStrings): StudyMode[] {
  const ids = new Set(CORE_STUDY_MODE_IDS);
  return getStudyModes(vi).filter((m) => ids.has(m.id));
}

export function getStudyMode(id: StudyModeId, vi: ViStrings): StudyMode {
  return getStudyModes(vi).find((m) => m.id === id)!;
}
