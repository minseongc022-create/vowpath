import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { IS_BETA } from "@/lib/beta";
import { SITE } from "@/lib/constants";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { resolveServerUiLocale } from "@/lib/locale";
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
  title: `${SITE.name} — Catch the Call. Keep the Contract.`,
  description:
    "Missed HVAC calls auto-book to your calendar. Crew SMS dispatch. Agreement Keeper turns completed jobs into maintenance plans. Jobber optional.",
  openGraph: {
    title: `${SITE.name} — Missed Call → Calendar → PM Plan`,
    description:
      "Auto-book clear jobs. Text back for urgent or unclear. Offer maintenance plans when jobs complete. Built for 1–5 truck shops.",
    type: "website" as const,
  },
};

const enBetaMeta = {
  ...enMeta,
  title: `${SITE.name} — Public Beta · Missed Call Coverage`,
  description:
    "Beta for US residential HVAC. After-hours intake and text approval. Jobber optional.",
  openGraph: {
    ...enMeta.openGraph,
    title: `${SITE.name} — Public Beta · Missed Call Coverage`,
    description: "Catch after-hours calls. Approve by text. Works with your existing tools.",
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

export const metadata: Metadata = IS_BETA ? enBetaMeta : enMeta;

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
