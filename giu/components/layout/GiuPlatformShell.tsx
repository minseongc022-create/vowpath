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
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <meta name="application-name" content={GIU_STRINGS.brand} />
        <meta name="theme-color" content="#3182f6" />
      </head>
      <body className="min-h-dvh bg-giu-bg font-sans antialiased text-giu-ink giu-theme">
        {children}
      </body>
    </html>
  );
}
