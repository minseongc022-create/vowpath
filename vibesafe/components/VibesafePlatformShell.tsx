import Link from "next/link";
import { VIBESAFE_BRAND } from "../lib/brand";
import { getSession } from "../lib/session";
import { VibesafeMark } from "./VibesafeLogo";
import "@/app/globals.css";
import "../styles/vibesafe.css";

/**
 * 로그인 여부에 따라 헤더가 달라진다. 서버에서 세션을 읽어 렌더하므로
 * 로그인한 사람에게 "로그인" 버튼이 잠깐 번쩍이는 일이 없다.
 */
export async function VibesafePlatformShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <head>
        <meta name="theme-color" content="#f5f6fa" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="vs-body">
        <div className="vs-app">
          <header className="vs-header">
            <div className="vs-header-inner">
              <Link href={session ? "/vibesafe/dashboard" : "/vibesafe"} className="vs-wordmark">
                <VibesafeMark />
                {VIBESAFE_BRAND.name}
              </Link>
              <nav className="vs-header-nav" aria-label="주 메뉴">
                {session ? (
                  <>
                    <Link href="/vibesafe/dashboard" className="vs-nav-link">
                      내 앱
                    </Link>
                    <Link href="/vibesafe/notifications" className="vs-nav-link">
                      알림
                    </Link>
                    <Link href="/vibesafe/account" className="vs-nav-link">
                      계정
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/vibesafe/login" className="vs-nav-link">
                      로그인
                    </Link>
                    <Link href="/vibesafe/signup" className="vs-btn vs-btn-primary vs-btn-sm">
                      시작하기
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          <main className="vs-main">{children}</main>

          <footer className="vs-footer">
            <div className="vs-footer-inner">
              <strong style={{ color: "var(--vs-ink)" }}>{VIBESAFE_BRAND.name}</strong>
              <span>{VIBESAFE_BRAND.tagline}</span>
              <span className="vs-spacer" />
              <span>
                VibeSafe는 여러분의 저장소를 읽기만 하고, 코드를 고치거나 배포하지 않습니다.
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
