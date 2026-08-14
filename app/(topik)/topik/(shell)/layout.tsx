import { TopikAppChromeClient } from "@/topik/components/layout/TopikAppChromeClient";
import { TopikFocusProvider } from "@/topik/components/focus/TopikFocusProvider";
import { TopikLocaleProvider } from "@/topik/lib/i18n/TopikLocaleProvider";
import { getRequestTopikLocale } from "@/topik/lib/i18n/request-locale";
import { stringsForLocale } from "@/topik/lib/i18n/strings";
import { getProgress, resolveTopikUserId } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";

export default async function TopikShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [progress, locale] = await Promise.all([
    getProgress(userId),
    getRequestTopikLocale(),
  ]);
  const strings = stringsForLocale(locale);

  return (
    <TopikLocaleProvider locale={locale} strings={strings}>
      <TopikFocusProvider>
        <TopikAppChromeClient streak={progress.streak} targetLevel={progress.targetLevel}>
          {children}
        </TopikAppChromeClient>
      </TopikFocusProvider>
    </TopikLocaleProvider>
  );
}
