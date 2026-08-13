/** Malhaeboka-style 6 side-rail modes — adapted for Korean learning */

export type LearningModeId =
  | "vocab"
  | "conversation"
  | "grammar"
  | "expression"
  | "listening"
  | "settings";

export type LearningMode = {
  id: LearningModeId;
  href: string;
  /** CSS tint class on side rail (not Malhaeboka colors — semantic) */
  railClass: string;
};

export const LEARNING_MODES: LearningMode[] = [
  { id: "vocab", href: "/topik/vocab", railClass: "topik-rail-vocab" },
  { id: "conversation", href: "/topik/conversation", railClass: "topik-rail-conversation" },
  { id: "grammar", href: "/topik/grammar", railClass: "topik-rail-grammar" },
  { id: "expression", href: "/topik/expression", railClass: "topik-rail-expression" },
  { id: "listening", href: "/topik/listening", railClass: "topik-rail-listening" },
  { id: "settings", href: "/topik/settings", railClass: "topik-rail-settings" },
];

export const STUDY_HUB_MODES = LEARNING_MODES.filter((m) => m.id !== "settings");
