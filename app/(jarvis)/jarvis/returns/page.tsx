import type { Metadata } from "next";
import { ReturnsView } from "@/jarvis/ui/ReturnsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "반품 · 자비스",
  description: "반품 신청을 공급처 규정과 법정 기준에 맞춰 처리합니다",
};

export default function JarvisReturnsPage() {
  return <ReturnsView />;
}
