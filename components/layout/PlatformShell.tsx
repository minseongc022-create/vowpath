import { Inter } from "next/font/google";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { EffiroadAssistantRoot } from "@/components/assistant/EffiroadAssistantRoot";
import { resolveServerUiLocale, uiLocaleHtmlLang } from "@/lib/locale";
import { shouldShowEffiroadAssistant } from "@/lib/shell-route";
import { SITE_ICON_VERSION, siteJsonLd, siteFaqJsonLd, siteOrganizationJsonLd, siteWebSiteJsonLd } from "@/lib/site-metadata";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Effiroad phone/dispatch product shell — never used for /learn or /topik routes. */
export async function PlatformShell({ children }: { children: React.ReactNode }) {
  const locale = await resolveServerUiLocale();
  const iconV = SITE_ICON_VERSION;
  const showAssistant = await shouldShowEffiroadAssistant();

  return (
    <html lang={uiLocaleHtmlLang(locale)} className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href={`/favicon.ico?v=${iconV}`} sizes="any" />
        <link rel="icon" href={`/favicon-32.png?v=${iconV}`} type="image/png" sizes="32x32" />
        <link rel="icon" href={`/favicon-16.png?v=${iconV}`} type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href={`/apple-touch-icon.png?v=${iconV}`} sizes="180x180" />
        <link rel="manifest" href={`/site.webmanifest?v=${iconV}`} />
        <meta name="google-site-verification" content="6i-sr0bUxG3eyTX3Ou63jOTDemIS_RztmmoaZ3VWPIg" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="w-full min-w-0 overflow-x-hidden font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteOrganizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteWebSiteJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteFaqJsonLd()) }}
        />
        <LocaleProvider initialLocale={locale}>
          {children}
          {showAssistant ? <EffiroadAssistantRoot /> : null}
        </LocaleProvider>
      </body>
    </html>
  );
}
