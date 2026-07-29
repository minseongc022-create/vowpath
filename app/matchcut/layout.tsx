import type { Metadata } from "next";
import { MATCHCUT } from "@/lib/matchcut/constants";

export const metadata: Metadata = {
  title: MATCHCUT.name,
  description: MATCHCUT.description,
};

export default function MatchCutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 to-slate-50 text-slate-900">
      {children}
    </div>
  );
}
