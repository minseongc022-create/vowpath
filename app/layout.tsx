import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { IS_BETA } from "@/lib/beta";
import { SITE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = IS_BETA
  ? {
      title: `${SITE.name} — 야간 통화 메모 → Jobber Job Card`,
      description:
        "미국 HVAC(Jobber) 퍼블릭 베타. 야간·주말 통화 메모를 AI가 긴급도·주소·배차 메모로 정리합니다.",
      openGraph: {
        title: `${SITE.name} — Jobber용 Job Card`,
        description: "메모 붙여넣기 → 긴급도 분류 → Jobber에 복사",
        type: "website",
      },
    }
  : {
      title: `${SITE.name} — 놓친 HVAC 콜을 Jobber 예약으로`,
      description:
        "원하는 시간대만 AI가 받는 HVAC 전용 야간·주말 콜 처리. 긴급도 분류, Jobber 예약, Dispatcher Job Card.",
      openGraph: {
        title: `${SITE.name} — 맞춤 시간대 HVAC 콜 AI`,
        description:
          "놓친 전화 = 잃은 매출. 맞춤 스케줄 + Jobber 예약 + Job Card.",
        type: "website",
      },
    };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
