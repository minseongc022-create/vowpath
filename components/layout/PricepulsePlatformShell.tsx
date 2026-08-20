/** Internal ops tool shell — no marketing chrome, no JSON-LD, not indexed. */
export function PricepulsePlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Pricepulse" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="min-h-dvh bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
