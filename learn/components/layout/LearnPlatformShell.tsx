import "@/learn/styles/learn.css";

/** Isolated HTML shell for Lane Learn — zero Effiroad dispatch chrome. */
export function LearnPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <meta name="application-name" content="Lane Learn" />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="min-h-dvh bg-learn-bg font-sans antialiased text-learn-ink learn-theme">
        {children}
      </body>
    </html>
  );
}
