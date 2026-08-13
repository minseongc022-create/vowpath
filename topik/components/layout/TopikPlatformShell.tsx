import "@/learn/styles/learn.css";
import "@/topik/styles/topik.css";
import { TOPIK_BRAND } from "@/topik/lib/brand";

/** Isolated HTML shell for TOPIK Master VN — zero Effiroad dispatch chrome or AI widget. */
export function TopikPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <meta name="application-name" content={TOPIK_BRAND.name} />
      </head>
      <body className="min-h-dvh bg-learn-bg font-sans antialiased text-learn-ink learn-theme topik-theme">
        {children}
      </body>
    </html>
  );
}
