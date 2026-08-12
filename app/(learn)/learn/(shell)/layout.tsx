import { LearnHeader } from "@/learn/components/layout/LearnHeader";
import { LearnBottomNav } from "@/learn/components/layout/LearnBottomNav";

export default function LearnShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LearnHeader />
      <div className="pb-[calc(3.5rem+var(--learn-safe-bottom))] md:pb-0">
        {children}
      </div>
      <LearnBottomNav />
    </>
  );
}
