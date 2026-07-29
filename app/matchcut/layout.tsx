import type { Metadata } from "next";
import { MATCHCUT } from "@/lib/matchcut/constants";

export const metadata: Metadata = {
  title: MATCHCUT.name,
  description: MATCHCUT.description,
};

/** MatchCut root — no Effiroad chrome; marketing uses (marketing) group */
export default function MatchCutRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
