import type { Metadata } from "next";
import { IBM_Plex_Sans_KR, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const sans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "소형 세무·기장 사무소를 위한 수임처 자료 요청 자동화. 전화·개인 카톡 독촉 대신 정보성 알림톡과 현황판으로 마감을 맞춥니다.",
  applicationName: SITE.name,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
