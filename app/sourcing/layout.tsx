import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소싱 상세 — 실사진 + URL 매칭",
  description:
    "1688·타오바오 URL과 실제 상품 사진으로 옵션을 자동 매칭하고 새 각도 상세 이미지를 생성합니다.",
};

export default function SourcingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {children}
    </div>
  );
}
