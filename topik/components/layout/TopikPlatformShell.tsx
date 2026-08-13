import { Be_Vietnam_Pro } from "next/font/google";
import "@/topik/styles/topik.css";
import { TOPIK_BRAND } from "@/topik/lib/brand";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-be-vietnam",
});

/** Isolated HTML shell for HanPro — zero Effiroad / Lane Learn overlap. */
export function TopikPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="application-name" content={TOPIK_BRAND.name} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#e8344e" />
      </head>
      <body className={`${beVietnam.className} topik-theme min-h-dvh antialiased`}>
        {children}
      </body>
    </html>
  );
}
