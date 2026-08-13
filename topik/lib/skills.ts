/** Five TOPIK-oriented skills — Korean pedagogy, not Malhaeboka English patterns */

export type SkillId = "vocab" | "grammar" | "conversation" | "expression" | "listening";

export type Skill = {
  id: SkillId;
  href: string;
  sessionHref: string;
  /** Why this matters for Korean (shown on home) */
  focusVi: string;
  focusEn: string;
};

export const TOPIK_SKILLS: Skill[] = [
  {
    id: "vocab",
    href: "/topik/vocab",
    sessionHref: "/topik/vocab/session",
    focusVi: "Nghĩa tiếng Việt → chọn từ Hàn · phiên âm · ví dụ TOPIK",
    focusEn: "Vietnamese meaning → pick Korean · romanization · TOPIK examples",
  },
  {
    id: "grammar",
    href: "/topik/grammar",
    sessionHref: "/topik/grammar/session",
    focusVi: "Chọn trợ từ (을/를, 이/가…) · chia đuôi · cấp độ lịch sự",
    focusEn: "Particles · verb endings · honorific level",
  },
  {
    id: "conversation",
    href: "/topik/conversation",
    sessionHref: "/topik/speaking",
    focusVi: "Tình huống thật → luyện nói · AI sửa lỗi người Việt",
    focusEn: "Real scenarios → speaking · AI fixes VN-specific errors",
  },
  {
    id: "expression",
    href: "/topik/expression",
    sessionHref: "/topik/expression/session",
    focusVi: "Kính ngữ · cụm từ tự nhiên · không dịch word-by-word",
    focusEn: "Honorifics · natural phrases · not word-by-word translation",
  },
  {
    id: "listening",
    href: "/topik/listening",
    sessionHref: "/topik/listening/session",
    focusVi: "Nghe Hàn → gõ lại · phân biệt âm dễ nhầm (ㄱ/ㅋ, ㅓ/ㅗ)",
    focusEn: "Hear Korean → type · minimal pairs (ㄱ/ㅋ, ㅓ/ㅗ)",
  },
];

export function getSkill(id: SkillId): Skill {
  return TOPIK_SKILLS.find((s) => s.id === id)!;
}
