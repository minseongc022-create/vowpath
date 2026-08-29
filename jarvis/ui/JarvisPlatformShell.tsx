import { EFFIROAD_BRAND } from "@/jarvis/brand";

/**
 * 자비스 최상위 셸 — html/body 껍데기
 *
 * ★ 옛 toss-shop CSS를 더 이상 안 끌고 온다
 *
 * 옛 셸은 `toss-shop/styles/toss-shop.css`(367줄)와 ts-* 유틸리티 클래스를
 * 통째로 실었다. 그런데 자비스 화면은 ts-* 클래스를 **하나도 쓰지 않는다** —
 * 전부 styled-jsx와 jv-* 변수로 직접 그린다. 옛 CSS는 자비스에 아무 영향도
 * 주지 않으면서 모든 페이지에 실려 있었을 뿐이라 여기서 끊는다.
 *
 * 배경·글꼴 같은 실제 스타일은 JarvisShell이 :root와 html/body에 직접
 * 넣는다 — 그래서 여기서는 껍데기만 만든다.
 */
export function JarvisPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          rel="stylesheet"
        />
        <meta name="application-name" content={EFFIROAD_BRAND.nameKo} />
        <meta name="theme-color" content="#3182f6" />
      </head>
      <body>{children}</body>
    </html>
  );
}
