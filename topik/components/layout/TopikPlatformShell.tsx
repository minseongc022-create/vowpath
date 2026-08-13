import "@/learn/styles/learn.css";
import "@/topik/styles/topik.css";
import { TOPIK_BRAND } from "@/topik/lib/brand";

/** Isolated HTML shell for TOPIK Master VN */
export function TopikPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="application-name" content={TOPIK_BRAND.name} />
        <style>{`
          :root {
            --topik-font-body: "Nunito", system-ui, sans-serif;
            --topik-font-ko: "Noto Sans KR", "Nunito", sans-serif;
          }
        `}</style>
      </head>
      <body className="min-h-dvh bg-learn-bg font-sans antialiased text-learn-ink learn-theme topik-theme topik-scroll">
        {children}
      </body>
    </html>
  );
}
