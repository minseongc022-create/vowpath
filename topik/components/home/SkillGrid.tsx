"use client";

import Link from "next/link";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { TOPIK_SKILLS, type SkillId } from "@/topik/lib/skills";
import {
  IconChat,
  IconGrammar,
  IconHeadphones,
  IconPerson,
  IconSparkle,
} from "@/topik/components/ui/TopikIcons";
import { vi } from "@/topik/lib/i18n/vi";

const SKILL_ICONS: Record<SkillId, React.ComponentType<{ size?: number }>> = {
  vocab: IconPerson,
  grammar: IconGrammar,
  conversation: IconChat,
  expression: IconSparkle,
  listening: IconHeadphones,
};

const SKILL_LABELS: Record<SkillId, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  conversation: "Hội thoại",
  expression: "Biểu đạt",
  listening: "Nghe",
};

export function SkillGrid() {
  const { locale } = useTopikLocale();

  return (
    <div className="topik-skill-grid">
      {TOPIK_SKILLS.map((skill) => {
        const Icon = SKILL_ICONS[skill.id];
        const focus = locale === "vi" ? skill.focusVi : skill.focusEn;
        return (
          <Link key={skill.id} href={skill.sessionHref} className="topik-skill-card">
            <span className="topik-mode-icon topik-mode-icon-sm">
              <Icon size={18} />
            </span>
            <span className="topik-skill-card-title">{SKILL_LABELS[skill.id]}</span>
            <span className="topik-skill-card-desc">{focus}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** TOPIK differentiators — not in generic language apps */
export function TopikToolsRow() {
  const tools = [
    { href: "/topik/speaking", title: vi.home.speakingTitle, desc: "AI · IBT" },
    { href: "/topik/writing", title: vi.home.writingTitle, desc: "Câu 51–54" },
    { href: "/topik/mock-exam", title: vi.home.mockExamTitle, desc: "20 phút" },
    { href: "/topik/review", title: vi.home.reviewTitle, desc: "SRS" },
  ];

  return (
    <div className="topik-tools-section">
      <p className="topik-section-title mb-2">Công cụ TOPIK</p>
      <div className="topik-mode-list">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="topik-mode-row">
            <span className="flex-1 text-sm font-medium text-learn-ink">{tool.title}</span>
            <span className="text-xs text-learn-ink-muted">{tool.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
