import "@/mano/styles/mano.css";
import { MANO_STRINGS } from "@/mano/lib/strings";

export function ManoPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="application-name" content={MANO_STRINGS.brand} />
        <meta name="theme-color" content="#0d9488" />
      </head>
      <body className="min-h-dvh bg-mano-bg font-sans antialiased text-mano-ink mano-theme">
        {children}
      </body>
    </html>
  );
}
