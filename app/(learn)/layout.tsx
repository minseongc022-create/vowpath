import type { Metadata, Viewport } from "next";
import "@/learn/styles/learn.css";
import { LearnAuthProvider } from "@/learn/components/providers/LearnAuthProvider";

export const metadata: Metadata = {
  title: {
    default: "EFFIROAD — AI 초밀착 학습",
    template: "%s · EFFIROAD",
  },
  description:
    "AI 학습 에이전트가 실시간으로 커리큘럼을 조정합니다. iPad 가로 모드까지 완벽한 YouTube형 학습 경험.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3182f6",
};

export default function LearnRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="learn-theme">
      <LearnAuthProvider>
        {children}
      </LearnAuthProvider>
    </div>
  );
}
