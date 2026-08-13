import { TopikHeader } from "@/topik/components/layout/TopikHeader";
import { TopikBottomNav } from "@/topik/components/layout/TopikBottomNav";

export default function TopikShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopikHeader />
      <div className="pb-[calc(3.5rem+var(--learn-safe-bottom))]">
        {children}
      </div>
      <TopikBottomNav />
    </>
  );
}
