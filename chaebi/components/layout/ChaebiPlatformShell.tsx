import "@/chaebi/styles/chaebi.css";
import { CHAEBI_BRAND } from "@/chaebi/lib/brand";

/**
 * 채비 전용 html/body.
 *
 * 다른 제품의 전역 CSS·플로팅 위젯·인증 셸이 하나도 안 들어오게 루트에서
 * 갈라진다(app/layout.tsx). 이 앱은 모바일 앱처럼 보여야 해서 body에서
 * 스크롤 바운스를 잡고 폭을 고정한다.
 */
export function ChaebiPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="manifest" href="/chaebi/site.webmanifest" />
        <link rel="icon" href="/chaebi/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/chaebi/apple-touch-icon.png" />
        <meta name="application-name" content={CHAEBI_BRAND.name} />
        <meta name="apple-mobile-web-app-title" content={CHAEBI_BRAND.name} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content={CHAEBI_BRAND.themeColor} />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="chaebi-theme">{children}</body>
    </html>
  );
}
