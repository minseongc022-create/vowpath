import { TopikAppChromeClient } from "@/topik/components/layout/TopikAppChromeClient";
import { TopikFocusProvider } from "@/topik/components/focus/TopikFocusProvider";
import { getProgress, resolveTopikUserId } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";

export default async function TopikShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const progress = await getProgress(userId);

  return (
    <TopikFocusProvider>
      <TopikAppChromeClient streak={progress.streak} targetLevel={progress.targetLevel}>
        {children}
      </TopikAppChromeClient>
    </TopikFocusProvider>
  );
}
