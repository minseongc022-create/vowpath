import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { IS_BETA } from "@/lib/beta";
import { SITE } from "@/lib/constants";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { isEnglishUi, resolveServerUiLocale } from "@/lib/locale";
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

const enMeta = {
  ...siteMetadataBase,
  title: `${SITE.name} — AI Booking OS for HVAC`,
  description:
    "Turn missed HVAC calls into booked jobs. AI intake, SMS approval, Auto Book · Risk Based · Manual modes. Optional Jobber sync.",
  openGraph: {
    title: `${SITE.name} — AI Booking Operating System`,
    description:
      "Missed call → AI intake → SMS approval → booked job. Your shop number. Live in 10 minutes.",
    type: "website" as const,
  },
};

const enBetaMeta = {
  ...enMeta,
  title: `${SITE.name} — Public Beta · AI Booking OS`,
  description:
    "Beta for US residential HVAC shops. AI intake, booking modes, SMS approval. Jobber optional.",
  openGraph: {
    ...enMeta.openGraph,
    title: `${SITE.name} — Public Beta · AI Booking OS`,
    description:
      "Missed calls → AI intake → booked job. Start free during beta.",
  },
};

const koMeta = {
  ...siteMetadataBase,
  title: `${SITE.name} — 바쁜 날, 문자로 예약 승인`,
  description:
    "야간·피크·현장에서도 휴대폰 SMS로 신규 요청 확인. Reply 1=확정, 2=거절. AI intake + Job Card.",
  openGraph: {
    title: `${SITE.name} — 야간 콜, 문자로 처리`,
    description: "맞춤 시간대 AI 수신 · 긴급 SMS · 1/2 승인. Jobber는 선택 연동.",
    type: "website" as const,
  },
};

export const metadata: Metadata = isEnglishUi()
  ? IS_BETA
    ? enBetaMeta
    : enMeta
  : koMeta;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveServerUiLocale();

  return (
    <html lang={locale === "ko" ? "ko" : "en"} className={inter.variable}>
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
      <body className="font-sans">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
