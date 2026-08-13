import "@/topik/styles/topik.css";
import { TOPIK_BRAND } from "@/topik/lib/brand";

/** Isolated HTML shell for HanPro TOPIK VN — zero Effiroad / Lane Learn overlap. */
export function TopikPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="application-name" content={TOPIK_BRAND.name} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#e8344e" />
      </head>
      <body className="topik-theme min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
