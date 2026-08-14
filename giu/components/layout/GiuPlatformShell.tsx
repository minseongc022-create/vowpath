import "@/giu/styles/giu.css";
import { GIU_STRINGS } from "@/giu/lib/strings";

export function GiuPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="application-name" content={GIU_STRINGS.brand} />
        <meta name="theme-color" content="#2d6a4f" />
      </head>
      <body className="min-h-dvh bg-giu-bg font-sans antialiased text-giu-ink giu-theme">
        {children}
      </body>
    </html>
  );
}
