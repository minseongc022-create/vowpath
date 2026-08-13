"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { getThemesByCategory, type ConversationTheme } from "@/topik/lib/drills/conversation-themes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";

function ThemeCard({ theme }: { theme: ConversationTheme }) {
  return (
    <Link href={theme.href} className="topik-theme-card block">
      <p className="topik-theme-card-title">{theme.titleVi}</p>
      <p className="topik-theme-card-desc">{theme.subtitleVi}</p>
    </Link>
  );
}

function ThemeSection({
  title,
  category,
}: {
  title: string;
  category: ConversationTheme["category"];
}) {
  const themes = getThemesByCategory(category);
  if (!themes.length) return null;
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-sm font-bold text-learn-ink">{title}</h2>
      <div className="topik-theme-row">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>
    </section>
  );
}

export function ConversationThemesClient() {
  const t = useTopikStrings();

  return (
    <div className="topik-animate-in">
      <TopikPageHeader
        title={t.conversation.title}
        subtitle="Tình huống thật → trả lời bằng tiếng Hàn → AI chấm phát âm"
      />
      <ThemeSection title={t.conversation.special} category="special" />
      <ThemeSection title={t.conversation.workplace} category="workplace" />
      <ThemeSection title={t.conversation.daily} category="daily" />
      <ThemeSection title={t.conversation.topik} category="topik" />
    </div>
  );
}
