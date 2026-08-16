import "@/giu/styles/giu.css";
import { GIU_STRINGS } from "@/giu/lib/strings";

export function GiuPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <meta name="application-name" content={GIU_STRINGS.brand} />
        <meta name="theme-color" content="#2D3E4E" />
      </head>
      <body className="min-h-dvh bg-giu-bg font-sans antialiased text-giu-ink giu-theme">
        {children}
      </body>
    </html>
  );
}
