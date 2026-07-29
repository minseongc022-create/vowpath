import type { Metadata } from "next";
import { MATCHCUT } from "@/lib/matchcut/constants";

export const metadata: Metadata = {
  title: `${MATCHCUT.name} (legacy route)`,
  description: MATCHCUT.description,
};

export default function SourcingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {children}
    </div>
  );
}
