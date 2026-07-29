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
    <div className="min-h-screen bg-gradient-to-b from-trust-50/40 via-white to-slate-50 text-slate-900">
      {children}
    </div>
  );
}
