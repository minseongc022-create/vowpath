/** TOPIK study mode registry */

import { vi } from "@/topik/lib/i18n/vi";

export type StudyModeId =
  | "speaking"
  | "writing"
  | "practice"
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

export const STUDY_MODES: StudyMode[] = [
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
    id: "mock-exam",
    href: "/topik/mock-exam",
    title: vi.home.mockExamTitle,
    desc: vi.home.mockExamDesc,
    tint: "blue",
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
    desc: "Theo dõi câu sai · ôn lại cho đến khi thuộc",
    tint: "coral",
  },
];

export const HOME_FAVORITE_MODES: StudyModeId[] = [
  "speaking",
  "mock-exam",
  "writing",
  "practice",
  "lessons",
  "review",
];

export function getStudyMode(id: StudyModeId): StudyMode {
  return STUDY_MODES.find((m) => m.id === id)!;
}
