import Link from "next/link";
import { DAJEONG_BRAND } from "../lib/brand";
import { SparkleIcon } from "./DajeongIcons";
import { DajeongAuthProvider } from "./DajeongAuthProvider";
import { DajeongAuthStatus } from "./DajeongAuthStatus";
import "@/app/globals.css";
import "../styles/dajeong.css";

export function DajeongPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f8f3ec" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="dj-body">
        <DajeongAuthProvider>
          <div className="dj-app">
            <header className="dj-header">
              <div className="dj-header-inner">
                <Link href="/dajeong" className="dj-wordmark" aria-label={`${DAJEONG_BRAND.name} 홈`}>
                  <span className="dj-logo-mark"><SparkleIcon size={18} /></span>
                  <span>{DAJEONG_BRAND.name}</span>
                </Link>
                <nav className="dj-header-nav" aria-label="주 메뉴">
                  <Link href="/dajeong" className="dj-nav-link">새 계획</Link>
                  <Link href="/dajeong/plans" className="dj-nav-link">내 계획</Link>
                  <Link href="/dajeong/companions" className="dj-nav-link">동반자</Link>
                  <Link href="/dajeong/notifications" className="dj-nav-link">알림</Link>
                  <DajeongAuthStatus />
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
      </body>
    </html>
  );
}
