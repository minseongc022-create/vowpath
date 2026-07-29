import type { Metadata } from "next";
import { MATCHCUT } from "@/lib/matchcut/constants";

export const metadata: Metadata = {
  title: `${MATCHCUT.name} — ${MATCHCUT.nameEn}`,
  description: MATCHCUT.description,
  robots: { index: true },
};

export default function MatchCutMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#191F28]">
      {children}
    </div>
  );
}
