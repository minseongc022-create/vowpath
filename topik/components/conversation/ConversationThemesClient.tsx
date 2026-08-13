"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import {
  CONVERSATION_THEMES,
  getThemesByCategory,
  type ConversationTheme,
} from "@/topik/lib/drills/conversation-themes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";

function ThemeCard({ theme }: { theme: ConversationTheme }) {
  return (
    <Link href={theme.href} className="topik-theme-card" style={{ background: theme.gradient }}>
      <div className="topik-theme-card-content">
        <p className="text-sm font-bold text-white drop-shadow">{theme.titleVi}</p>
        <p className="mt-0.5 text-[10px] text-white/80">{theme.subtitleVi}</p>
      </div>
      {theme.progress != null && theme.progress > 0 && (
        <div className="topik-theme-progress">
          <div className="topik-theme-progress-fill" style={{ width: `${theme.progress}%` }} />
        </div>
      )}
    </Link>
  );
}

function ThemeSection({
  title,
  category,
  wide,
}: {
  title: string;
  category: ConversationTheme["category"];
  wide?: boolean;
}) {
  const themes = getThemesByCategory(category);
  if (themes.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-bold text-learn-ink">{title}</h2>
      <div className={wide ? "topik-theme-row-wide" : "topik-theme-row"}>
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>
    </section>
  );
}

/** Malhaeboka 실전회화 — themed conversation cards */
export function ConversationThemesClient() {
  const t = useTopikStrings();

  return (
    <div className="topik-animate-in">
      <TopikPageHeader
        title={t.conversation.title}
        subtitle={`${t.conversation.difficulty} · TOPIK 1-2`}
      />

      <ThemeSection title={t.conversation.special} category="special" wide />
      <ThemeSection title={t.conversation.workplace} category="workplace" />
      <ThemeSection title={t.conversation.daily} category="daily" />
      <ThemeSection title={t.conversation.topik} category="topik" />

      <p className="mt-4 text-center text-xs text-learn-ink-muted">
        {CONVERSATION_THEMES.length} chủ đề · Luyện nói với AI chấm phát âm
      </p>
    </div>
  );
}
