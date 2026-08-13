"use client";

import Link from "next/link";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { getSkill, type SkillId } from "@/topik/lib/skills";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";

type Props = {
  skillId: SkillId;
};

export function SkillLanding({ skillId }: Props) {
  const { locale, t } = useTopikLocale();
  const skill = getSkill(skillId);
  const title = t.modes[skillId as keyof typeof t.modes] ?? skillId;
  const focus = locale === "vi" ? skill.focusVi : skill.focusEn;

  return (
    <main className="topik-page topik-animate-in">
      <TopikPageHeader title={title} subtitle={focus} />

      <div className="topik-card mt-6 p-6 text-center">
        <p className="text-sm text-learn-ink-muted leading-relaxed">{focus}</p>
        <Link href={skill.sessionHref} className="topik-btn topik-btn-primary topik-btn-lg mt-6">
          {t.home.todayMode}
        </Link>
      </div>

      {skillId === "conversation" && (
        <p className="mt-4 text-center text-xs text-learn-ink-muted">
          Luyện nói với AI · sửa lỗi phát âm đặc thù người Việt
        </p>
      )}
    </main>
  );
}
