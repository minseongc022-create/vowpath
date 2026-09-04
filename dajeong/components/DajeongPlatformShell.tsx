import Link from "next/link";
import { DAJEONG_BRAND } from "../lib/brand";
import { DAJEONG_THEME_STORAGE_KEY, DEFAULT_DAJEONG_THEME } from "../lib/theme";
import { SparkleIcon } from "./DajeongIcons";
import { DajeongAuthProvider } from "./DajeongAuthProvider";
import { DajeongAuthStatus } from "./DajeongAuthStatus";
import { DajeongThemeProvider, ThemePicker } from "./DajeongTheme";
import "@/app/globals.css";
import "../styles/dajeong.css";

/**
 * 저장해 둔 테마를 첫 페인트 전에 칠한다 — React가 붙기 전에 기본색이 한 번 번쩍이면
 * 색을 고른 의미가 없다.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(DAJEONG_THEME_STORAGE_KEY)});document.documentElement.dataset.djTheme=t||${JSON.stringify(DEFAULT_DAJEONG_THEME)};}catch(e){document.documentElement.dataset.djTheme=${JSON.stringify(DEFAULT_DAJEONG_THEME)};}})();`;

export function DajeongPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-scroll-behavior="smooth" data-dj-theme={DEFAULT_DAJEONG_THEME} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f6f8fd" />
        <link rel="icon" href="/haruwith/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/haruwith/favicon-16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/haruwith/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/haruwith/site.webmanifest" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="dj-body">
        <DajeongThemeProvider>
          <DajeongAuthProvider>
            <div className="dj-app">
              <header className="dj-header">
                <div className="dj-header-inner">
                  <Link href="/dajeong" className="dj-wordmark" aria-label={`${DAJEONG_BRAND.name} 홈`}>
                    {DAJEONG_BRAND.name}
                  </Link>
                  <nav className="dj-header-nav" aria-label="주 메뉴">
                    <Link href="/dajeong" className="dj-nav-link">새 계획</Link>
                    <Link href="/dajeong/plans" className="dj-nav-link">내 계획</Link>
                    <Link href="/dajeong/companions" className="dj-nav-link">동반자</Link>
                    <Link href="/dajeong/notifications" className="dj-nav-link">알림</Link>
                    <DajeongAuthStatus />
                    <ThemePicker />
                    <span className="dj-ai-badge"><SparkleIcon size={14} /> 실행형 AI 컨시어지</span>
                  </nav>
                </div>
              </header>
              <main>{children}</main>
              <footer className="dj-footer">
                <div>
                  <strong>{DAJEONG_BRAND.name}</strong>
                  <span>{DAJEONG_BRAND.tagline}</span>
                </div>
                <p>장소 정보는 확인 시점의 외부 데이터이며 가격·영업·예약 가능 여부는 실행 전에 다시 확인합니다.</p>
              </footer>
            </div>
          </DajeongAuthProvider>
        </DajeongThemeProvider>
      </body>
    </html>
  );
}
