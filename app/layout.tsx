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

const siteMetadataBase = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const metadata: Metadata = IS_BETA
  ? {
      ...siteMetadataBase,
      title: `${SITE.name} — 바쁠 때 문자로 예약 확인`,
      description:
        "미국 HVAC 퍼블릭 베타. 야간·주말 콜을 AI가 받고, 휴대폰 SMS로 1=확정·2=거절. Jobber 연동은 선택.",
      openGraph: {
        title: `${SITE.name} — 현장에서 문자 승인`,
        description: "야간 콜 → SMS 알림 → Reply 1/2. Job Card 자동 정리.",
        type: "website",
      },
    }
  : {
      ...siteMetadataBase,
      title: `${SITE.name} — 바쁜 날, 문자로 예약 승인`,
      description:
        "야간·피크·현장에서도 휴대폰 SMS로 신규 요청 확인. Reply 1=확정, 2=거절. AI intake + Job Card.",
      openGraph: {
        title: `${SITE.name} — 야간 콜, 문자로 처리`,
        description:
          "맞춤 시간대 AI 수신 · 긴급 SMS · 1/2 승인. Jobber는 선택 연동.",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
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
