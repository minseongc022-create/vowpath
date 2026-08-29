import type { Metadata } from "next";
import { ReviewView } from "@/jarvis/ui/ReviewView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "검수 · 자비스",
  description: "고객에게 보일 모습 그대로 확인하고 승인하세요",
};

export default function JarvisReviewPage() {
  return <ReviewView />;
}
