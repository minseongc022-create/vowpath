import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE_ICON_VERSION, buildSiteMetadata, siteJsonLd } from "@/lib/site-metadata";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { resolveServerUiLocale } from "@/lib/locale";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveServerUiLocale();
  return buildSiteMetadata(locale === "ko" ? "ko" : "en");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveServerUiLocale();
  const iconV = SITE_ICON_VERSION;

  return (
    <html lang={locale === "ko" ? "ko" : "en"} className={inter.variable}>
      <head>
        <link rel="icon" href={`/favicon.ico?v=${iconV}`} sizes="any" />
        <link rel="icon" href={`/favicon-32.png?v=${iconV}`} type="image/png" sizes="32x32" />
        <link rel="icon" href={`/favicon-16.png?v=${iconV}`} type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href={`/apple-touch-icon.png?v=${iconV}`} sizes="180x180" />
        <link rel="manifest" href={`/site.webmanifest?v=${iconV}`} />
        <meta name="theme-color" content="#faf8f5" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
