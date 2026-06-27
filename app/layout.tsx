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
  metadataBase: new URL(SITE.url),
  icons: {
    icon: [
      { url: "/favicon.ico?v=9", sizes: "any" },
      { url: "/favicon-32.png?v=9", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png?v=9", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=9", sizes: "180x180", type: "image/png" }],
  },
};

const enMeta = {
  ...siteMetadataBase,
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    "The road to efficiency for HVAC shops. Missed calls auto-book to your calendar. Crew SMS dispatch. Jobber optional.",
  openGraph: {
    title: `${SITE.name} — The Road to Efficiency`,
    description:
      "Efficiency + Road: auto-book clear jobs, text back for urgent calls, and run the shop from your phone. Built for 1–5 truck shops.",
    type: "website" as const,
    url: SITE.url,
    siteName: SITE.name,
  },
};

const enBetaMeta = {
  ...enMeta,
  title: `${SITE.name} — Public Beta · ${SITE.tagline}`,
  description:
    "Beta for US residential HVAC. The road to efficiency — after-hours intake and text approval. Jobber optional.",
  openGraph: {
    ...enMeta.openGraph,
    title: `${SITE.name} — Public Beta · The Road to Efficiency`,
    description: "Catch after-hours calls. Approve by text. The efficient path for owner-operators.",
  },
};

const koMeta = {
  ...siteMetadataBase,
  title: `${SITE.name} — 효율로 가는 길`,
  description:
    "효율적인 길 — 야간·피크·현장에서도 휴대폰 SMS로 신규 요청 확인. Reply 1=확정, 2=거절. AI intake + Job Card.",
  openGraph: {
    title: `${SITE.name} — 효율로 가는 길`,
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
        <link rel="icon" href="/favicon.ico?v=9" sizes="any" />
        <link rel="icon" href="/favicon-32.png?v=9" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16.png?v=9" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=9" sizes="180x180" />
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
