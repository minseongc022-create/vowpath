import { MatchCutApp } from "@/components/matchcut/MatchCutApp";
import { MATCHCUT } from "@/lib/matchcut/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${MATCHCUT.name} — ${MATCHCUT.nameEn} | 실사진 URL 옵션 매칭 + 상세컷`,
  description: MATCHCUT.description,
};

export default function MatchCutPage() {
  return <MatchCutApp />;
}
