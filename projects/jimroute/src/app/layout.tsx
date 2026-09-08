import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "짐루트 — 이사업체 견적·배차·고객안내",
  description:
    "한국 소형 이사업체를 위한 견적 자동화, 카톡 공유, 배차, 고객 실시간 안내 SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${noto.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
