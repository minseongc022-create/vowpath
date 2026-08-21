import "@/toss-shop/styles/toss-shop.css";
import { SELLER_PULSE_BRAND } from "@/toss-shop/lib/brand";

export function TossShopPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          rel="stylesheet"
        />
        <meta name="application-name" content={SELLER_PULSE_BRAND.name} />
        <meta name="theme-color" content="#3182f6" />
      </head>
      <body className="min-h-dvh bg-ts-bg font-sans antialiased text-ts-ink toss-shop-theme">
        {children}
      </body>
    </html>
  );
}
