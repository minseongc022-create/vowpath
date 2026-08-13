import { TopikHeader } from "@/topik/components/layout/TopikHeader";
import { TopikBottomNav } from "@/topik/components/layout/TopikBottomNav";
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
    <>
      <TopikHeader streak={progress.streak} targetLevel={progress.targetLevel} />
      <div className="pb-[calc(var(--topik-nav-height)+1rem+var(--learn-safe-bottom))]">
        {children}
      </div>
      <TopikBottomNav />
    </>
  );
}
